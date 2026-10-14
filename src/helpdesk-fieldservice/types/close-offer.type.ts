// What closing the work case of a completed order offers: the resolution to start from, or why nothing is offered.
export type CloseOffer = { kind: 'offer'; resolution: string | null } | { kind: 'refuse'; reason: string };
