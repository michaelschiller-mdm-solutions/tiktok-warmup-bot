"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ReviewQueueService_1 = require("../services/ReviewQueueService");
const router = express_1.default.Router();
const reviewService = new ReviewQueueService_1.ReviewQueueService();
router.get('/', async (req, res) => {
    try {
        const { status = 'pending', limit = 50, offset = 0, model_id } = req.query;
        const reviews = await reviewService.getReviewQueue(status, parseInt(limit), parseInt(offset));
        res.json({
            success: true,
            data: reviews,
            metadata: {
                status,
                limit: parseInt(limit),
                offset: parseInt(offset),
                count: reviews.length
            }
        });
    }
    catch (error) {
        console.error('Error fetching review queue:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch review queue'
        });
    }
});
router.get('/analytics', async (req, res) => {
    try {
        const analytics = await reviewService.getReviewAnalytics();
        res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        console.error('Error fetching review analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch review analytics'
        });
    }
});
router.get('/by-model/:modelId?', async (req, res) => {
    try {
        const modelId = req.params.modelId ? parseInt(req.params.modelId) : undefined;
        if (req.params.modelId && isNaN(modelId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid model ID'
            });
        }
        const reviewsByModel = await reviewService.getReviewsByModel(modelId);
        res.json({
            success: true,
            data: reviewsByModel
        });
    }
    catch (error) {
        console.error('Error fetching reviews by model:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch reviews by model'
        });
    }
});
router.get('/:reviewId', async (req, res) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        if (isNaN(reviewId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid review ID'
            });
        }
        const reviewDetails = await reviewService.getReviewDetails(reviewId);
        if (!reviewDetails) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }
        res.json({
            success: true,
            data: reviewDetails
        });
    }
    catch (error) {
        console.error('Error fetching review details:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch review details'
        });
    }
});
router.post('/:reviewId/claim', async (req, res) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        const { assigned_to } = req.body;
        if (isNaN(reviewId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid review ID'
            });
        }
        if (!assigned_to) {
            return res.status(400).json({
                success: false,
                error: 'assigned_to is required'
            });
        }
        const success = await reviewService.claimReview(reviewId, assigned_to);
        if (!success) {
            return res.status(409).json({
                success: false,
                error: 'Review already claimed or not found'
            });
        }
        res.json({
            success: true,
            message: 'Review claimed successfully'
        });
    }
    catch (error) {
        console.error('Error claiming review:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to claim review'
        });
    }
});
router.post('/:reviewId/release', async (req, res) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        if (isNaN(reviewId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid review ID'
            });
        }
        const success = await reviewService.releaseReview(reviewId);
        if (!success) {
            return res.status(409).json({
                success: false,
                error: 'Review not claimed or not found'
            });
        }
        res.json({
            success: true,
            message: 'Review released successfully'
        });
    }
    catch (error) {
        console.error('Error releasing review:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to release review'
        });
    }
});
router.post('/:reviewId/resolve', async (req, res) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        const { resolution_method, resolution_notes, resolved_by } = req.body;
        if (isNaN(reviewId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid review ID'
            });
        }
        if (!resolution_method || !resolved_by) {
            return res.status(400).json({
                success: false,
                error: 'resolution_method and resolved_by are required'
            });
        }
        const validMethods = [
            'retry_bot', 'manual_completion', 'skip_phase', 'reset_account',
            'change_content', 'escalate_support', 'other'
        ];
        if (!validMethods.includes(resolution_method)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid resolution method',
                validMethods
            });
        }
        const success = await reviewService.resolveReview({
            reviewId,
            resolutionMethod: resolution_method,
            resolutionNotes: resolution_notes || '',
            resolvedBy: resolved_by
        });
        if (!success) {
            return res.status(409).json({
                success: false,
                error: 'Review not found or already resolved'
            });
        }
        res.json({
            success: true,
            message: 'Review resolved successfully'
        });
    }
    catch (error) {
        console.error('Error resolving review:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to resolve review'
        });
    }
});
router.post('/:reviewId/escalate', async (req, res) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        const { escalated_by, escalation_notes } = req.body;
        if (isNaN(reviewId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid review ID'
            });
        }
        if (!escalated_by || !escalation_notes) {
            return res.status(400).json({
                success: false,
                error: 'escalated_by and escalation_notes are required'
            });
        }
        const success = await reviewService.escalateReview(reviewId, escalated_by, escalation_notes);
        if (!success) {
            return res.status(409).json({
                success: false,
                error: 'Review not found'
            });
        }
        res.json({
            success: true,
            message: 'Review escalated successfully'
        });
    }
    catch (error) {
        console.error('Error escalating review:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to escalate review'
        });
    }
});
router.post('/create', async (req, res) => {
    try {
        const { account_id, phase, failure_type, failure_message, created_by } = req.body;
        if (!account_id || !phase || !failure_type || !failure_message || !created_by) {
            return res.status(400).json({
                success: false,
                error: 'account_id, phase, failure_type, failure_message, and created_by are required'
            });
        }
        const validPhases = ['pfp', 'bio', 'post', 'highlight', 'story'];
        if (!validPhases.includes(phase)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phase',
                validPhases
            });
        }
        const validFailureTypes = [
            'bot_error', 'instagram_challenge', 'content_rejection', 'captcha',
            'rate_limit', 'account_suspended', 'network_error', 'timeout', 'other'
        ];
        if (!validFailureTypes.includes(failure_type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid failure type',
                validFailureTypes
            });
        }
        const reviewId = await reviewService.createManualReview(parseInt(account_id), phase, failure_type, failure_message, created_by);
        if (!reviewId) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create review'
            });
        }
        res.json({
            success: true,
            data: { reviewId },
            message: 'Review created successfully'
        });
    }
    catch (error) {
        console.error('Error creating manual review:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to create manual review'
        });
    }
});
exports.default = router;
//# sourceMappingURL=reviews.js.map