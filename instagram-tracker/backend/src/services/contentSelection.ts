import { PrismaClient } from '@prisma/client';
import { createLogger, Logger } from '../utils/logger';
import {
  ContentSelectionOptions,
  ContentSelectionResult
} from '../types/maintenance';

export interface ContentItem {
  id: number;
  groupId: number;
  filename: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  lastUsed?: Date;
  usageCount: number;
  qualityScore: number;
  mood?: string;
  location?: string;
  hashtags: string[];
  seasonalMonths: number[];
  performanceMetrics?: {
    engagementRate: number;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
  };
}

export interface ContentSelectionConfig {
  qualityScoreWeight: number;
  recencyWeight: number;
  seasonalWeight: number;
  diversityWeight: number;
  performanceWeight: number;
  maxContentAge: number; // days
  minQualityScore: number;
  maxUsageFrequency: number;
  enforceSeasonalRelevance: boolean;
}

export interface ContentAnalytics {
  contentId: number;
  totalViews: number;
  avgEngagementRate: number;
  lastPerformanceDate: Date;
  trendScore: number;
  seasonalPerformance: Record<string, number>;
}

export class ContentSelectionService {
  private prisma: PrismaClient;
  private logger: Logger;
  private config: ContentSelectionConfig;

  constructor(
    prisma: PrismaClient,
    config: Partial<ContentSelectionConfig> = {}
  ) {
    this.prisma = prisma;
    this.logger = createLogger('ContentSelection');
    this.config = {
      qualityScoreWeight: 0.3,
      recencyWeight: 0.2,
      seasonalWeight: 0.25,
      diversityWeight: 0.15,
      performanceWeight: 0.1,
      maxContentAge: 90, // 3 months
      minQualityScore: 6.0,
      maxUsageFrequency: 3,
      enforceSeasonalRelevance: true,
      ...config
    };
  }

  /**
   * Select optimal content for maintenance operation
   */
  async selectMaintenanceContent(
    groupId: number,
    targetCount: number,
    options: ContentSelectionOptions
  ): Promise<number[]> {
    try {
      this.logger.debug('Starting content selection', {
        groupId,
        targetCount,
        options
      });

      // Get all available content for the group
      const availableContent = await this.getAvailableContent(groupId, options);

      if (availableContent.length === 0) {
        this.logger.warn('No available content found', { groupId });
        return [];
      }

      // Score and rank content
      const scoredContent = await this.scoreContent(availableContent, options);

      // Apply selection strategies
      const selectedContent = await this.applySelectionStrategies(
        scoredContent,
        targetCount,
        options
      );

      // Log selection results
      this.logger.info('Content selection completed', {
        groupId,
        available: availableContent.length,
        selected: selectedContent.length,
        targetCount,
        averageQuality: this.calculateAverageQuality(selectedContent)
      });

      return selectedContent.map(item => item.id);
    } catch (error) {
      this.logger.error('Content selection failed', {
        error: error.message,
        groupId,
        targetCount
      });
      throw error;
    }
  }

  /**
   * Get detailed content selection result with reasoning
   */
  async selectMaintenanceContentDetailed(
    groupId: number,
    targetCount: number,
    options: ContentSelectionOptions
  ): Promise<ContentSelectionResult> {
    const startTime = Date.now();
    
    try {
      const availableContent = await this.getAvailableContent(groupId, options);
      const scoredContent = await this.scoreContent(availableContent, options);
      const selectedContent = await this.applySelectionStrategies(
        scoredContent,
        targetCount,
        options
      );

      const averageQuality = this.calculateAverageQuality(selectedContent);
      const alternativeIds = scoredContent
        .filter(item => !selectedContent.includes(item))
        .slice(0, Math.min(5, targetCount))
        .map(item => item.id);

      const reason = this.generateSelectionReason(
        availableContent.length,
        selectedContent.length,
        targetCount,
        options
      );

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
    } catch (error) {
      return {
        contentIds: [],
        reason: `Selection failed: ${error.message}`,
        qualityScore: 0,
        alternativeIds: [],
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Get available content for selection
   */
  private async getAvailableContent(
    groupId: number,
    options: ContentSelectionOptions
  ): Promise<ContentItem[]> {
    const currentMonth = new Date().getMonth() + 1;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (options.maxAge || this.config.maxContentAge));

    // Build base query
    const whereConditions: any = {
      highlightGroupId: groupId,
      uploadedAt: { gte: cutoffDate }
    };

    // Exclude specific content if requested
    if (options.excludeContentIds && options.excludeContentIds.length > 0) {
      whereConditions.id = { notIn: options.excludeContentIds };
    }

    // Apply quality filter
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

    // Transform to ContentItem format
    const transformedContent: ContentItem[] = content.map(item => ({
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

    // Apply seasonal filtering
    if (options.respectSeasonal && this.config.enforceSeasonalRelevance) {
      return transformedContent.filter(item => 
        item.seasonalMonths.length === 0 || 
        item.seasonalMonths.includes(currentMonth)
      );
    }

    // Apply recency filtering
    if (options.avoidRecent) {
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - 7); // Last 7 days
      
      return transformedContent.filter(item => 
        !item.lastUsed || item.lastUsed < recentCutoff
      );
    }

    return transformedContent;
  }

  /**
   * Score content based on various factors
   */
  private async scoreContent(
    content: ContentItem[],
    options: ContentSelectionOptions
  ): Promise<ContentItem[]> {
    const now = new Date();
    
    for (const item of content) {
      let score = 0;

      // Quality score component
      score += (item.qualityScore / 10) * this.config.qualityScoreWeight;

      // Recency component (newer content gets higher score)
      const daysSinceUpload = Math.floor((now.getTime() - item.uploadedAt.getTime()) / (24 * 3600000));
      const recencyScore = Math.max(0, 1 - (daysSinceUpload / this.config.maxContentAge));
      score += recencyScore * this.config.recencyWeight;

      // Seasonal relevance component
      if (options.respectSeasonal) {
        const currentMonth = now.getMonth() + 1;
        const seasonalScore = item.seasonalMonths.length === 0 ? 0.8 : 
          item.seasonalMonths.includes(currentMonth) ? 1.0 : 0.3;
        score += seasonalScore * this.config.seasonalWeight;
      } else {
        score += 0.8 * this.config.seasonalWeight; // Neutral seasonal score
      }

      // Usage frequency component (less used content gets higher score)
      const maxUsage = Math.max(...content.map(c => c.usageCount));
      const usageScore = maxUsage > 0 ? 1 - (item.usageCount / maxUsage) : 1;
      score += usageScore * this.config.diversityWeight;

      // Performance component
      if (options.optimizeForPerformance && item.performanceMetrics) {
        const perfScore = Math.min(1, item.performanceMetrics.engagementRate / 100);
        score += perfScore * this.config.performanceWeight;
      } else {
        score += 0.5 * this.config.performanceWeight; // Neutral performance score
      }

      // Store the calculated score
      item.qualityScore = Math.min(10, score * 10); // Scale to 0-10
    }

    // Sort by score (highest first)
    return content.sort((a, b) => b.qualityScore - a.qualityScore);
  }

  /**
   * Apply selection strategies to choose final content
   */
  private async applySelectionStrategies(
    scoredContent: ContentItem[],
    targetCount: number,
    options: ContentSelectionOptions
  ): Promise<ContentItem[]> {
    if (scoredContent.length <= targetCount) {
      return scoredContent;
    }

    let selectedContent: ContentItem[] = [];

    // Strategy 1: Ensure diversity in content types
    const contentByType = this.groupContentByType(scoredContent);
    const typesNeeded = Math.min(Object.keys(contentByType).length, targetCount);
    
    // Select at least one from each type if possible
    for (const [type, items] of Object.entries(contentByType)) {
      if (selectedContent.length < typesNeeded) {
        selectedContent.push(items[0]); // Best item of this type
      }
    }

    // Strategy 2: Fill remaining slots with highest scored content
    const remainingSlots = targetCount - selectedContent.length;
    const remainingContent = scoredContent.filter(item => 
      !selectedContent.some(selected => selected.id === item.id)
    );

    selectedContent.push(...remainingContent.slice(0, remainingSlots));

    // Strategy 3: Apply mood/location diversity if metadata available
    if (selectedContent.length === targetCount) {
      selectedContent = this.optimizeForDiversity(selectedContent, scoredContent);
    }

    return selectedContent.slice(0, targetCount);
  }

  /**
   * Group content by file type
   */
  private groupContentByType(content: ContentItem[]): Record<string, ContentItem[]> {
    return content.reduce((acc, item) => {
      const type = item.fileType.split('/')[0]; // 'image' or 'video'
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    }, {} as Record<string, ContentItem[]>);
  }

  /**
   * Optimize selection for diversity in mood and location
   */
  private optimizeForDiversity(
    selected: ContentItem[],
    available: ContentItem[]
  ): ContentItem[] {
    // If we have mood/location data, try to diversify
    const moodCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();

    selected.forEach(item => {
      if (item.mood) {
        moodCounts.set(item.mood, (moodCounts.get(item.mood) || 0) + 1);
      }
      if (item.location) {
        locationCounts.set(item.location, (locationCounts.get(item.location) || 0) + 1);
      }
    });

    // Try to replace duplicates with more diverse options
    const optimized = [...selected];
    
    for (let i = 0; i < optimized.length; i++) {
      const current = optimized[i];
      
      // Check if this item creates too much repetition
      const moodCount = current.mood ? moodCounts.get(current.mood) || 0 : 0;
      const locationCount = current.location ? locationCounts.get(current.location) || 0 : 0;
      
      if (moodCount > 2 || locationCount > 2) {
        // Try to find a better alternative
        const alternatives = available.filter(alt => 
          !optimized.some(sel => sel.id === alt.id) &&
          alt.qualityScore >= current.qualityScore * 0.8 && // Within 20% quality
          (!alt.mood || (moodCounts.get(alt.mood) || 0) < moodCount) &&
          (!alt.location || (locationCounts.get(alt.location) || 0) < locationCount)
        );

        if (alternatives.length > 0) {
          // Replace with the best alternative
          const replacement = alternatives[0];
          optimized[i] = replacement;
          
          // Update counts
          if (current.mood) moodCounts.set(current.mood, moodCount - 1);
          if (current.location) locationCounts.set(current.location, locationCount - 1);
          if (replacement.mood) moodCounts.set(replacement.mood, (moodCounts.get(replacement.mood) || 0) + 1);
          if (replacement.location) locationCounts.set(replacement.location, (locationCounts.get(replacement.location) || 0) + 1);
        }
      }
    }

    return optimized;
  }

  /**
   * Calculate average quality score of selected content
   */
  private calculateAverageQuality(content: ContentItem[]): number {
    if (content.length === 0) return 0;
    
    const totalQuality = content.reduce((sum, item) => sum + item.qualityScore, 0);
    return Math.round((totalQuality / content.length) * 100) / 100;
  }

  /**
   * Generate human-readable selection reason
   */
  private generateSelectionReason(
    availableCount: number,
    selectedCount: number,
    targetCount: number,
    options: ContentSelectionOptions
  ): string {
    const reasons: string[] = [];

    if (selectedCount < targetCount) {
      reasons.push(`Selected ${selectedCount}/${targetCount} items (limited by availability)`);
    } else {
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

  /**
   * Get list of applied strategies
   */
  private getAppliedStrategies(options: ContentSelectionOptions): string[] {
    const strategies: string[] = ['quality_scoring', 'diversity_optimization'];

    if (options.respectSeasonal) strategies.push('seasonal_filtering');
    if (options.avoidRecent) strategies.push('recency_filtering');
    if (options.optimizeForPerformance) strategies.push('performance_optimization');

    return strategies;
  }

  /**
   * Analyze content performance for optimization
   */
  async analyzeContentPerformance(groupId: number): Promise<ContentAnalytics[]> {
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

  /**
   * Calculate content trend score
   */
  private calculateTrendScore(usageHistory: any[]): number {
    if (usageHistory.length < 2) return 5.0; // Neutral score
    
    // Simple trend calculation based on recent usage
    const recent = usageHistory.slice(-5); // Last 5 uses
    const older = usageHistory.slice(-10, -5); // Previous 5 uses
    
    const recentAvg = recent.reduce((sum, usage) => sum + (usage.engagementRate || 0), 0) / recent.length;
    const olderAvg = older.length > 0 ? 
      older.reduce((sum, usage) => sum + (usage.engagementRate || 0), 0) / older.length : recentAvg;
    
    return Math.min(10, Math.max(0, 5 + (recentAvg - olderAvg) * 5));
  }

  /**
   * Calculate seasonal performance breakdown
   */
  private calculateSeasonalPerformance(usageHistory: any[]): Record<string, number> {
    const seasonalData: Record<string, { total: number; count: number }> = {};
    
    usageHistory.forEach(usage => {
      const month = new Date(usage.usedAt).getMonth() + 1;
      const season = this.getSeasonFromMonth(month);
      
      if (!seasonalData[season]) {
        seasonalData[season] = { total: 0, count: 0 };
      }
      
      seasonalData[season].total += usage.engagementRate || 0;
      seasonalData[season].count += 1;
    });

    // Calculate averages
    const result: Record<string, number> = {};
    Object.entries(seasonalData).forEach(([season, data]) => {
      result[season] = data.count > 0 ? data.total / data.count : 0;
    });

    return result;
  }

  /**
   * Get season from month number
   */
  private getSeasonFromMonth(month: number): string {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  /**
   * Get content selection statistics
   */
  async getSelectionStatistics(groupId: number): Promise<{
    totalContent: number;
    avgQualityScore: number;
    contentByType: Record<string, number>;
    seasonalDistribution: Record<string, number>;
    usageDistribution: Record<string, number>;
    lastSelectionDate?: Date;
  }> {
    const content = await this.getAvailableContent(groupId, {
      respectSeasonal: false,
      avoidRecent: false,
      optimizeForPerformance: false
    });

    const contentByType = this.groupContentByType(content);
    const typeDistribution = Object.entries(contentByType).reduce((acc, [type, items]) => {
      acc[type] = items.length;
      return acc;
    }, {} as Record<string, number>);

    const seasonalDistribution = content.reduce((acc, item) => {
      const seasons = item.seasonalMonths.map(month => this.getSeasonFromMonth(month));
      seasons.forEach(season => {
        acc[season] = (acc[season] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const usageDistribution = content.reduce((acc, item) => {
      const usage = item.usageCount;
      const bucket = usage === 0 ? 'unused' : 
                   usage <= 2 ? 'low' : 
                   usage <= 5 ? 'medium' : 'high';
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalContent: content.length,
      avgQualityScore: this.calculateAverageQuality(content),
      contentByType: typeDistribution,
      seasonalDistribution,
      usageDistribution,
      lastSelectionDate: undefined // Would come from maintenance history
    };
  }
}

export default ContentSelectionService; 