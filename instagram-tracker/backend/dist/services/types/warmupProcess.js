"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentType = exports.WarmupPhaseStatus = exports.WarmupPhase = void 0;
var WarmupPhase;
(function (WarmupPhase) {
    WarmupPhase["MANUAL_SETUP"] = "manual_setup";
    WarmupPhase["BIO"] = "bio";
    WarmupPhase["GENDER"] = "gender";
    WarmupPhase["NAME"] = "name";
    WarmupPhase["USERNAME"] = "username";
    WarmupPhase["FIRST_HIGHLIGHT"] = "first_highlight";
    WarmupPhase["NEW_HIGHLIGHT"] = "new_highlight";
    WarmupPhase["POST_CAPTION"] = "post_caption";
    WarmupPhase["POST_NO_CAPTION"] = "post_no_caption";
    WarmupPhase["STORY_CAPTION"] = "story_caption";
    WarmupPhase["STORY_NO_CAPTION"] = "story_no_caption";
})(WarmupPhase || (exports.WarmupPhase = WarmupPhase = {}));
var WarmupPhaseStatus;
(function (WarmupPhaseStatus) {
    WarmupPhaseStatus["PENDING"] = "pending";
    WarmupPhaseStatus["AVAILABLE"] = "available";
    WarmupPhaseStatus["CONTENT_ASSIGNED"] = "content_assigned";
    WarmupPhaseStatus["IN_PROGRESS"] = "in_progress";
    WarmupPhaseStatus["COMPLETED"] = "completed";
    WarmupPhaseStatus["FAILED"] = "failed";
    WarmupPhaseStatus["REQUIRES_REVIEW"] = "requires_review"; // Manual intervention needed
})(WarmupPhaseStatus || (exports.WarmupPhaseStatus = WarmupPhaseStatus = {}));
var ContentType;
(function (ContentType) {
    ContentType["PFP"] = "pfp";
    ContentType["BIO"] = "bio";
    ContentType["POST"] = "post";
    ContentType["HIGHLIGHT"] = "highlight";
    ContentType["STORY"] = "story";
    ContentType["ANY"] = "any";
})(ContentType || (exports.ContentType = ContentType = {}));
