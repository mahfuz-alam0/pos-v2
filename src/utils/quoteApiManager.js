// Global request de-duplicator/debouncer for GetQuoteForSales. Prevents rapid
// callers (register/drawer change, customer select, delivery type, etc.) from
// firing overlapping quote requests, and backs off after a 403.
class QuoteApiManager {
  constructor() {
    this.pendingCall = null;
    this.lastCallTime = 0;
    this.debounceDelay = 1000;
    this.lastPayloadHash = null;
    this.callInProgress = false;
  }

  hashPayload(payload) {
    if (!payload) return "";
    return JSON.stringify({
      customerId: payload.customerId,
      lineItems: payload.lineItems?.length || 0,
      drawerId: payload.drawerId,
      registerId: payload.registerId,
      tipGiven: payload.tipGiven,
      miscCharges: payload.miscCharges?.length || 0,
      miscDiscount: payload.miscDiscount?.id || null,
      loyaltyPointsClaimed: payload.loyaltyPointsClaimed,
      couponId: payload.couponId,
    });
  }

  // ponytail: single global debounce window regardless of caller; upgrade to
  // per-caller keys if unrelated quote calls ever need to interleave.
  async call(apiFunction, payload, source = "unknown") {
    const now = Date.now();
    const payloadHash = this.hashPayload(payload);

    if (
      this.callInProgress &&
      payloadHash === this.lastPayloadHash &&
      now - this.lastCallTime < this.debounceDelay
    ) {
      if (this.pendingCall) return this.pendingCall;
    }

    if (this.callInProgress && this.pendingCall) {
      await this.pendingCall.catch(() => {});
    }

    const timeSinceLastCall = now - this.lastCallTime;
    if (timeSinceLastCall < this.debounceDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.debounceDelay - timeSinceLastCall)
      );
    }

    this.callInProgress = true;
    this.lastCallTime = Date.now();
    this.lastPayloadHash = payloadHash;

    this.pendingCall = apiFunction(payload)
      .then((response) => response)
      .catch((error) => {
        if (error?.response?.status === 403) {
          this.debounceDelay = 5000;
        }
        throw error;
      })
      .finally(() => {
        this.callInProgress = false;
        this.pendingCall = null;
      });

    return this.pendingCall;
  }

  reset() {
    this.lastPayloadHash = null;
    this.debounceDelay = 1000;
  }

  isCallInProgress() {
    return this.callInProgress;
  }
}

export const quoteApiManager = new QuoteApiManager();
