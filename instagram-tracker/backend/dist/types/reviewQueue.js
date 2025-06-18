"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolutionMethod = exports.ReviewStatus = exports.FailureType = void 0;
var FailureType;
(function (FailureType) {
    FailureType["BOT_ERROR"] = "bot_error";
    FailureType["INSTAGRAM_CHALLENGE"] = "instagram_challenge";
    FailureType["CONTENT_REJECTION"] = "content_rejection";
    FailureType["CAPTCHA"] = "captcha";
    FailureType["RATE_LIMIT"] = "rate_limit";
    FailureType["ACCOUNT_SUSPENDED"] = "account_suspended";
    FailureType["NETWORK_ERROR"] = "network_error";
    FailureType["TIMEOUT"] = "timeout";
    FailureType["OTHER"] = "other";
})(FailureType || (exports.FailureType = FailureType = {}));
var ReviewStatus;
(function (ReviewStatus) {
    ReviewStatus["PENDING"] = "pending";
    ReviewStatus["IN_PROGRESS"] = "in_progress";
    ReviewStatus["RESOLVED"] = "resolved";
    ReviewStatus["ESCALATED"] = "escalated";
    ReviewStatus["CANCELLED"] = "cancelled";
})(ReviewStatus || (exports.ReviewStatus = ReviewStatus = {}));
var ResolutionMethod;
(function (ResolutionMethod) {
    ResolutionMethod["RETRY_BOT"] = "retry_bot";
    ResolutionMethod["MANUAL_COMPLETION"] = "manual_completion";
    ResolutionMethod["SKIP_PHASE"] = "skip_phase";
    ResolutionMethod["RESET_ACCOUNT"] = "reset_account";
    ResolutionMethod["CHANGE_CONTENT"] = "change_content";
    ResolutionMethod["ESCALATE_SUPPORT"] = "escalate_support";
    ResolutionMethod["OTHER"] = "other";
})(ResolutionMethod || (exports.ResolutionMethod = ResolutionMethod = {}));
//# sourceMappingURL=reviewQueue.js.map