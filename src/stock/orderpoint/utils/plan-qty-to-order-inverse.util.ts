// A person typed "To Order". The stored qtyToOrder is then what the rule
// shows: the typed quantity when one is kept, else the computed one.
export const planQtyToOrderInverse = ({
  trigger,
  qtyToOrderManual,
  typed,
  computed,
}: {
  trigger: 'AUTO' | 'MANUAL';
  qtyToOrderManual: number;
  typed: number;
  computed: number;
}) => {
  let manual = qtyToOrderManual;

  if (trigger === 'AUTO') {
    manual = 0;
  } else if (manual === 0 && typed === 0) {
    manual = 0;
  } else if (typed !== computed) {
    manual = typed;
  }
  return { qtyToOrderManual: manual, qtyToOrder: manual !== 0 ? manual : computed };
};
