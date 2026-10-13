/** Imagens reais (fotografia de barbearia) usadas como padrão no SaaS.
 *  O ADM pode trocar qualquer imagem por URL própria ou upload no painel. */
const U = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const IMG = {
  interior: U('1585747860715-2ba37e788b70', 1600),
  cutHands: U('1503951914875-452162b0f3f1'),
  cuttingBack: U('1596728325488-58c87691e9af'),
  tattooBarber: U('1599351431202-1e0f0137899a'),
  maskedBarber: U('1605497788044-5a32c7078486'),
  shopBack: U('1622286342621-4bd786c2447c'),
  tools: U('1621607512022-6aecc4fed814'),
  vintageChair: U('1512690459411-b9245aed614b', 1400),
};
