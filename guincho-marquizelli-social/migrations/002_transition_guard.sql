CREATE OR REPLACE FUNCTION prevent_published_content_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state IN ('PUBLISHED','PUBLISHED_SIMULATED') AND NEW.state <> OLD.state THEN
    RAISE EXCEPTION 'Published content is immutable';
  END IF;
  IF OLD.state = 'REJECTED' AND NEW.state IN ('PUBLISHING','PUBLISHED','PUBLISHED_SIMULATED') THEN
    RAISE EXCEPTION 'Rejected content cannot be published';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER contents_terminal_state_guard
BEFORE UPDATE ON contents
FOR EACH ROW EXECUTE FUNCTION prevent_published_content_mutation();

CREATE OR REPLACE FUNCTION audit_content_state_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO audit_logs(content_id, content_version, actor_type, actor_id, action, from_state, to_state, metadata)
    VALUES (NEW.id, NEW.current_version, 'database', current_user, 'state_transition', OLD.state, NEW.state, '{}'::jsonb);
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER contents_state_audit
BEFORE UPDATE ON contents
FOR EACH ROW EXECUTE FUNCTION audit_content_state_transition();
