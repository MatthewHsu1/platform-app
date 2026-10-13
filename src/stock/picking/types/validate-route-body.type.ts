// The pop-up's answer to the backorder question: ticked transfers get a backorder, unticked ones none.
export type ValidateRouteBody = {
  pickingIds: string[];
  // noBackorderButton: the answer came from "No backorder", not from "Create backorder" with every row unticked.
  backorderAnswer?: { createBackorderIds: string[]; noBackorderIds: string[]; noBackorderButton?: boolean };
  skipExpired?: boolean;
};
