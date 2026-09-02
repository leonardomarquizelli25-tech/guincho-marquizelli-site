import { CopySchema, type Copy, type Strategy } from "../schemas/index.js";

export class CopywriterAgent {
  run(strategy: Strategy, changeInstruction?: string): Copy {
    const headline = changeInstruction && /headline|t[ií]tulo/i.test(changeInstruction)
      ? "SEU CARRO PEDIU ATENÇÃO?"
      : strategy.hook.toUpperCase();
    const supportingText = changeInstruction && /mais (curt[oa]|conciso)|menos texto/i.test(changeInstruction)
      ? "Pare em segurança. Não insista."
      : "Pare com segurança e evite insistir.";
    return CopySchema.parse({
      headline,
      supporting_text: supportingText,
      cta: "Se não puder seguir, solicite o reboque.",
      caption: [
        "O veículo costuma dar sinais de que algo não está bem: perda de força, luzes de alerta, ruídos incomuns ou temperatura elevada podem indicar a necessidade de interromper a viagem.",
        "Se houver risco, sinalize o local e pare em uma área segura. Evite insistir em dirigir ou tentar um diagnóstico definitivo na via. Procure um profissional qualificado para verificar o veículo.",
        "Caso o veículo não possa seguir com segurança, solicite o reboque. A Guincho Marquizelli transporta seu veículo com cuidado."
      ].join("\n\n"),
      hashtags: ["#GuinchoMarquizelli", "#Reboque", "#SegurancaNoTransito", "#PaneAutomotiva", "#TransporteDeVeiculos"],
      carousel_slides: [],
      accessibility_description: "Arte educativa sobre sinais de pane, com foto real de caminhão-guincho e triângulo de sinalização.",
      alt_text: "Arte em vermelho, preto e branco com a frase O CARRO DEU SINAIS?, triângulo de sinalização e foto real de caminhão da Guincho Marquizelli."
    });
  }
}
