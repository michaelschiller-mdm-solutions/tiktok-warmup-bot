"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentSelectionService = void 0;
const logger_1 = require("../utils/logger");
class ContentSelectionService {
    constructor(prisma, config = {}) {
        this.prisma = prisma;
        this.logger = (0, logger_1.createLogger)('ContentSelection');
        this.config = {
            qualityScoreWeight: 0.3,
            recencyWeight: 0.2,
            seasonalWeight: 0.25,
            diversityWeight: 0.15,
            performanceWeight: 0.1,
            maxContentAge: 90,
            minQualityScore: 6.0,
            maxUsageFrequency: 3,
            enforceSeasonalRelevance: true,
            ...config
        };
    }
    async selectMaintenanceContent(groupId, targetCount, options) {
        try {
            this.logger.debug('Starting content selection', {
                groupId,
                targetCount,
                options
            });
            const availableContent = await this.getAvailableContent(groupId, options);
            if (availableContent.length === 0) {
                this.logger.warn('No available content found', { groupId });
                return [];
            }
            const scoredContent = await this.scoreContent(availableContent, options);
            const selectedContent = await this.applySelectionStrategies(scoredContent, targetCount, options);
            this.logger.info('Content selection completed', {
                groupId,
                available: availableContent.length,
                selected: selectedContent.length,
                targetCount,
                averageQuality: this.calculateAverageQuality(selectedContent)
            });
            return selectedContent.map(item => item.id);
        }
        catch (error) {
            this.logger.error('Content selection failed', {
                error: error.message,
                groupId,
                targetCount
            });
            throw error;
        }
    }
    async selectMaintenanceContentDetailed(groupId, targetCount, options) {
        const startTime = Date.now();
        try {
            const availableContent = await this.getAvailableContent(groupId, options);
            const scoredContent = await this.scoreContent(availableContent, options);
            const selectedContent = await this.applySelectionStrategies(scoredContent, targetCount, options);
            const averageQuality = this.calculateAverageQuality(selectedContent);
            const alternativeIds = scoredContent
                .filter(item => !selectedContent.includes(item))
                .slice(0, Math.min(5, targetCount))
                .map(item => item.id);
            const reason = this.generateSelectionReason(availableContent.length, selectedContent.length, targetCount, options);
            return {
                contentIds: selectedContent.map(item => item.id),
                reason,
                qualityScore: averageQuality,
                alternativeIds,
                metadata: {
                    selectionTime: Date.now() - startTime,
                    availableCount: availableContent.length,
                    strategies: this.getAppliedStrategies(options),
                    seasonalFiltering: options.respectSeasonal,
                    performanceOptimization: options.optimizeForPerformance
                }
            };
        }
        catch (error) {
            return {
                contentIds: [],
                reason: `Selection failed: ${error.message}`,
                qualityScore: 0,
                alternativeIds: [],
                metadata: { error: error.message }
            };
        }
    }
    async getAvailableContent(groupId, options) {
        const currentMonth = new Date().getMonth() + 1;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (options.maxAge || this.config.maxContentAge));
        const whereConditions = {
            highlightGroupId: groupId,
            uploadedAt: { gte: cutoffDate }
        };
        if (options.excludeContentIds && options.excludeContentIds.length > 0) {
            whereConditions.id = { notIn: options.excludeContentIds };
        }
        if (options.minQualityScore || this.config.minQualityScore) {
            whereConditions.qualityScore = {
                gte: options.minQualityScore || this.config.minQualityScore
            };
        }
        const content = await this.prisma.highlightGroupContent.findMany({
            where: whereConditions,
            include: {
                content: {
                    include: {
                        performanceMetrics: true
                    }
                }
            }
        });
        const transformedContent = content.map(item => ({
            id: item.content.id,
            groupId: item.highlightGroupId,
            filename: item.content.filename,
            filePath: item.content.filePath,
            fileType: item.content.fileType,
            fileSize: item.content.fileSize,
            uploadedAt: item.content.uploadedAt,
            lastUsed: item.content.lastUsed,
            usageCount: item.content.usageCount || 0,
            qualityScore: item.content.qualityScore || 5.0,
            mood: item.content.mood,
            location: item.content.location,
            hashtags: item.content.hashtags || [],
            seasonalMonths: item.content.seasonalMonths || [],
            performanceMetrics: item.content.performanceMetrics ? {
                engagementRate: item.content.performanceMetrics.engagementRate,
                viewsCount: item.content.performanceMetrics.viewsCount,
                likesCount: item.content.performanceMetrics.likesCount,
                commentsCount: item.content.performanceMetrics.commentsCount
            } : undefined
        }));
        if (options.respectSeasonal && this.config.enforceSeasonalRelevance) {
            return transformedContent.filter(item => item.seasonalMonths.length === 0 ||
                item.seasonalMonths.includes(currentMonth));
        }
        if (options.avoidRecent) {
            const recentCutoff = new Date();
            recentCutoff.setDate(recentCutoff.getDate() - 7);
            return transformedContent.filter(item => !item.lastUsed || item.lastUsed < recentCutoff);
        }
        return transformedContent;
    }
    async scoreContent(content, options) {
        const now = new Date();
        for (const item of content) {
            let score = 0;
            score += (item.qualityScore / 10) * this.config.qualityScoreWeight;
            const daysSinceUpload = Math.floor((now.getTime() - item.uploadedAt.getTime()) / (24 * 3600000));
            const recencyScore = Math.max(0, 1 - (daysSinceUpload / this.config.maxContentAge));
            score += recencyScore * this.config.recencyWeight;
            if (options.respectSeasonal) {
                const currentMonth = now.getMonth() + 1;
                const seasonalScore = item.seasonalMonths.length === 0 ? 0.8 :
                    item.seasonalMonths.includes(currentMonth) ? 1.0 : 0.3;
                score += seasonalScore * this.config.seasonalWeight;
            }
            else {
                score += 0.8 * this.config.seasonalWeight;
            }
            const maxUsage = Math.max(...content.map(c => c.usageCount));
            const usageScore = maxUsage > 0 ? 1 - (item.usageCount / maxUsage) : 1;
            score += usageScore * this.config.diversityWeight;
            if (options.optimizeForPerformance && item.performanceMetrics) {
                const perfScore = Math.min(1, item.performanceMetrics.engagementRate / 100);
                score += perfScore * this.config.performanceWeight;
            }
            else {
                score += 0.5 * this.config.performanceWeight;
            }
            item.qualityScore = Math.min(10, score * 10);
        }
        return content.sort((a, b) => b.qualityScore - a.qualityScore);
    }
    async applySelectionStrategies(scoredContent, targetCount, options) {
        if (scoredContent.length <= targetCount) {
            return scoredContent;
        }
        let selectedContent = [];
        const contentByType = this.groupContentByType(scoredContent);
        const typesNeeded = Math.min(Object.keys(contentByType).length, targetCount);
        for (const [type, items] of Object.entries(contentByType)) {
            if (selectedContent.length < typesNeeded) {
                selectedContent.push(items[0]);
            }
        }
        const remainingSlots = targetCount - selectedContent.length;
        const remainingContent = scoredContent.filter(item => !selectedContent.some(selected => selected.id === item.id));
        selectedContent.push(...remainingContent.slice(0, remainingSlots));
        if (selectedContent.length === targetCount) {
            selectedContent = this.optimizeForDiversity(selectedContent, scoredContent);
        }
        return selectedContent.slice(0, targetCount);
    }
    groupContentByType(content) {
        return content.reduce((acc, item) => {
            const type = item.fileType.split('/')[0];
            if (!acc[type])
                acc[type] = [];
            acc[type].push(item);
            return acc;
        }, {});
    }
    optimizeForDiversity(selected, available) {
        const moodCounts = new Map();
        const locationCounts = new Map();
        selected.forEach(item => {
            if (item.mood) {
                moodCounts.set(item.mood, (moodCounts.get(item.mood) || 0) + 1);
            }
            if (item.location) {
                locationCounts.set(item.location, (locationCounts.get(item.location) || 0) + 1);
            }
        });
        const optimized = [...selected];
        for (let i = 0; i < optimized.length; i++) {
            const current = optimized[i];
            const moodCount = current.mood ? moodCounts.get(current.mood) || 0 : 0;
            const locationCount = current.location ? locationCounts.get(current.location) || 0 : 0;
            if (moodCount > 2 || locationCount > 2) {
                const alternatives = available.filter(alt => !optimized.some(sel => sel.id === alt.id) &&
                    alt.qualityScore >= current.qualityScore * 0.8 &&
                    (!alt.mood || (moodCounts.get(alt.mood) || 0) < moodCount) &&
                    (!alt.location || (locationCounts.get(alt.location) || 0) < locationCount));
                if (alternatives.length > 0) {
                    const replacement = alternatives[0];
                    optimized[i] = replacement;
                    if (current.mood)
                        moodCounts.set(current.mood, moodCount - 1);
                    if (current.location)
                        locationCounts.set(current.location, locationCount - 1);
                    if (replacement.mood)
                        moodCounts.set(replacement.mood, (moodCounts.get(replacement.mood) || 0) + 1);
                    if (replacement.location)
                        locationCounts.set(replacement.location, (locationCounts.get(replacement.location) || 0) + 1);
                }
            }
        }
        return optimized;
    }
    calculateAverageQuality(content) {
        if (content.length === 0)
            return 0;
        const totalQuality = content.reduce((sum, item) => sum + item.qualityScore, 0);
        return Math.round((totalQuality / content.length) * 100) / 100;
    }
    generateSelectionReason(availableCount, selectedCount, targetCount, options) {
        const reasons = [];
        if (selectedCount < targetCount) {
            reasons.push(`Selected ${selectedCount}/${targetCount} items (limited by availability)`);
        }
        else {
            reasons.push(`Selected ${selectedCount} items from ${availableCount} available`);
        }
        if (options.respectSeasonal) {
            reasons.push('seasonal relevance considered');
        }
        if (options.avoidRecent) {
            reasons.push('recently used content avoided');
        }
        if (options.optimizeForPerformance) {
            reasons.push('performance metrics optimized');
        }
        return `Content selection: ${reasons.join(', ')}.`;
    }
    getAppliedStrategies(options) {
        const strategies = ['quality_scoring', 'diversity_optimization'];
        if (options.respectSeasonal)
            strategies.push('seasonal_filtering');
        if (options.avoidRecent)
            strategies.push('recency_filtering');
        if (options.optimizeForPerformance)
            strategies.push('performance_optimization');
        return strategies;
    }
    async analyzeContentPerformance(groupId) {
        const content = await this.prisma.highlightGroupContent.findMany({
            where: { highlightGroupId: groupId },
            include: {
                content: {
                    include: {
                        performanceMetrics: true,
                        usageHistory: true
                    }
                }
            }
        });
        return content.map(item => ({
            contentId: item.content.id,
            totalViews: item.content.performanceMetrics?.viewsCount || 0,
            avgEngagementRate: item.content.performanceMetrics?.engagementRate || 0,
            lastPerformanceDate: item.content.performanceMetrics?.recordedAt || new Date(),
            trendScore: this.calculateTrendScore(item.content.usageHistory || []),
            seasonalPerformance: this.calculateSeasonalPerformance(item.content.usageHistory || [])
        }));
    }
    calculateTrendScore(usageHistory) {
        if (usageHistory.length < 2)
            return 5.0;
        const recent = usageHistory.slice(-5);
        const older = usageHistory.slice(-10, -5);
        const recentAvg = recent.reduce((sum, usage) => sum + (usage.engagementRate || 0), 0) / recent.length;
        const olderAvg = older.length > 0 ?
            older.reduce((sum, usage) => sum + (usage.engagementRate || 0), 0) / older.length : recentAvg;
        return Math.min(10, Math.max(0, 5 + (recentAvg - olderAvg) * 5));
    }
    calculateSeasonalPerformance(usageHistory) {
        const seasonalData = {};
        usageHistory.forEach(usage => {
            const month = new Date(usage.usedAt).getMonth() + 1;
            const season = this.getSeasonFromMonth(month);
            if (!seasonalData[season]) {
                seasonalData[season] = { total: 0, count: 0 };
            }
            seasonalData[season].total += usage.engagementRate || 0;
            seasonalData[season].count += 1;
        });
        const result = {};
        Object.entries(seasonalData).forEach(([season, data]) => {
            result[season] = data.count > 0 ? data.total / data.count : 0;
        });
        return result;
    }
    getSeasonFromMonth(month) {
        if (month >= 3 && month <= 5)
            return 'spring';
        if (month >= 6 && month <= 8)
            return 'summer';
        if (month >= 9 && month <= 11)
            return 'fall';
        return 'winter';
    }
    async getSelectionStatistics(groupId) {
        const content = await this.getAvailableContent(groupId, {
            respectSeasonal: false,
            avoidRecent: false,
            optimizeForPerformance: false
        });
        const contentByType = this.groupContentByType(content);
        const typeDistribution = Object.entries(contentByType).reduce((acc, [type, items]) => {
            acc[type] = items.length;
            return acc;
        }, {});
        const seasonalDistribution = content.reduce((acc, item) => {
            const seasons = item.seasonalMonths.map(month => this.getSeasonFromMonth(month));
            seasons.forEach(season => {
                acc[season] = (acc[season] || 0) + 1;
            });
            return acc;
        }, {});
        const usageDistribution = content.reduce((acc, item) => {
            const usage = item.usageCount;
            const bucket = usage === 0 ? 'unused' :
                usage <= 2 ? 'low' :
                    usage <= 5 ? 'medium' : 'high';
            acc[bucket] = (acc[bucket] || 0) + 1;
            return acc;
        }, {});
        return {
            totalContent: content.length,
            avgQualityScore: this.calculateAverageQuality(content),
            contentByType: typeDistribution,
            seasonalDistribution,
            usageDistribution,
            lastSelectionDate: undefined
        };
    }
}
exports.ContentSelectionService = ContentSelectionService;
exports.default = ContentSelectionService;
//# sourceMappingURL=contentSelection.js.map