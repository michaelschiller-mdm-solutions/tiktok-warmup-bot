# Content Management Strategy

## Overview
Comprehensive strategy for managing Instagram content throughout the automation platform, including content creation workflows, template systems, assignment algorithms, and performance optimization for the warm-up and active campaign processes.

## **Content Architecture**

### **Content Categories**

#### **1. Profile Content**
- **Profile Pictures (pfp)**: Primary account imagery, first impression content
- **Bio Text**: Account description, personality, and value proposition
- **Location Data**: Geographic and niche-specific information

#### **2. Warm-up Content** 
- **Highlight Images**: Story highlight covers and content
- **Story Content**: 24-hour story posts with images and text
- **First Posts**: Initial feed posts to establish account activity

#### **3. Campaign Content**
- **Feed Posts**: Regular campaign content for active accounts
- **Story Campaigns**: Ongoing story content for engagement
- **Highlight Updates**: Updated highlight content for active campaigns

#### **4. Universal Content**
- **Any Category**: Flexible content usable across multiple categories
- **Template Content**: Reusable content sets for new models

## **Content Classification System**

### **Content Types**
```typescript
type ContentType = 
  | 'pfp'        // Profile pictures
  | 'post'       // Feed posts
  | 'highlight'  // Story highlights  
  | 'story'      // Story content
  | 'any';       // Multi-purpose content

type TextContentType = 
  | 'bio'        // Profile bio text
  | 'post'       // Post captions
  | 'story'      // Story text overlays
  | 'highlight'; // Highlight descriptions
```

### **Content Metadata**
```typescript
interface ContentMetadata {
  // Classification
  content_type: ContentType;
  niche_tags: string[];           // Fashion, lifestyle, fitness, etc.
  demographic_target: string[];   // Age groups, interests
  mood_tags: string[];           // Inspirational, casual, professional
  
  // Performance
  usage_count: number;
  success_rate: number;          // Based on account progression
  avg_engagement: number;        // When available from Instagram
  
  // Organization
  is_template: boolean;
  priority_score: number;        // 1-10 priority for assignment
  seasonal_tags: string[];       // Spring, summer, holidays, etc.
  
  // Quality
  quality_score: number;         // Manual/automated quality rating
  moderation_status: 'approved' | 'pending' | 'rejected';
  last_reviewed_at: Date;
}
```

## **Content Upload Workflows**

### **Single Content Upload**
```typescript
interface ContentUploadFlow {
  step1: 'file_selection';       // User selects image/text
  step2: 'content_classification'; // Auto-detect + manual tags
  step3: 'metadata_entry';       // Additional information
  step4: 'quality_review';       // Optional manual review
  step5: 'content_activation';   // Make available for assignment
}
```

#### **Upload Process**
1. **File Selection**
   - Drag & drop interface
   - Batch upload support (up to 50 files)
   - File type validation (JPG, PNG, MP4 for videos)
   - File size limits (max 10MB per image)

2. **Auto-Classification**
   - Image analysis for content type detection
   - Face detection for profile pictures
   - Text extraction from images (OCR)
   - Niche classification based on visual elements

3. **Manual Enhancement**
   - User can override auto-classifications
   - Add custom tags and descriptions
   - Set priority and seasonal relevance
   - Associate with specific text content

4. **Quality Control**
   - Automated quality checks (resolution, brightness, composition)
   - Optional manual review queue
   - Compliance checking (no inappropriate content)
   - Duplicate detection

### **Bulk Upload Workflow**
```typescript
interface BulkUploadProcess {
  // Preparation
  folder_organization: 'by_category' | 'by_niche' | 'mixed';
  naming_convention: string;     // Pattern for auto-classification
  metadata_csv: boolean;         // Include metadata spreadsheet
  
  // Processing
  batch_size: number;            // Process in chunks
  auto_classify: boolean;        // Attempt automatic classification
  require_review: boolean;       // All items need manual review
  
  // Validation
  duplicate_handling: 'skip' | 'rename' | 'replace';
  quality_threshold: number;     // Minimum quality score
  auto_reject_criteria: string[]; // Automatic rejection rules
}
```

## **Text Pool Management**

### **Text Creation Methods**

#### **1. Manual Text Entry**
- Rich text editor with formatting
- Character count with Instagram limits
- Hashtag suggestions and management
- Emoji picker integration

#### **2. CSV Import**
```csv
content_type,text_content,tags,priority,usage_limit
bio,"Fashion enthusiast | Style inspiration | DM for collabs","fashion,lifestyle",8,10
post,"New day, new outfit! What's your style inspiration today? #fashion #ootd","fashion,daily",7,5
story,"Behind the scenes of today's photoshoot ✨","bts,personal",6,3
```

#### **3. Template Import**
- Import from existing successful campaigns
- Cross-model content sharing
- Template libraries with proven performance

### **Text Pool Organization**
```typescript
interface TextPoolStructure {
  // Categorization
  content_type: TextContentType;
  niche_categories: string[];    // Main niche classifications
  tone_of_voice: 'casual' | 'professional' | 'inspirational' | 'humorous';
  engagement_type: 'question' | 'statement' | 'call_to_action' | 'story';
  
  // Usage Management
  usage_limit: number;           // Max times this text can be used
  current_usage: number;         // Times already used
  cooldown_period: number;       // Days before reuse allowed
  
  // Performance Tracking
  performance_score: number;     // Based on account success with this text
  engagement_rate: number;       // When available
  conversion_rate: number;       // Accounts that progressed using this text
}
```

## **Central Content Registry System**

### **Overview**
The Central Content Registry provides a unified content management system that enables cross-model content sharing, efficient batch operations, and organized content bundling for different campaign types.

### **Key Features**

#### **1. Centralized Content Storage**
- **Unified Repository**: Single location for all content assets across models
- **Cross-Model Sharing**: Content can be reused across multiple campaigns
- **Flexible Categorization**: JSONB-based tagging and categorization system
- **Mixed Media Support**: Images, videos, and text content in unified interface

#### **2. Content Bundle Management**
```typescript
interface ContentBundle {
  id: number;
  name: string;
  description: string;
  bundle_type: 'mixed' | 'images_only' | 'text_only';
  categories: string[];
  tags: string[];
  content_items: Array<{
    type: 'image' | 'video' | 'text';
    id: number;
    assignment_order: number;
  }>;
}
```

#### **3. Batch Operations**
- **Multi-Select Interface**: Select multiple content items simultaneously
- **Batch Assignment**: Assign multiple items to multiple bundles at once
- **Conflict Detection**: Prevent duplicate assignments with clear feedback
- **Progress Tracking**: Real-time feedback on batch operation results

#### **4. Enhanced Upload Experience**
- **Per-File Customization**: Individual settings for each uploaded file
- **Bundle Assignment During Upload**: Assign content to bundles during upload
- **Split-Panel Interface**: Global settings with per-file overrides
- **Visual Preview**: Thumbnail previews with status indicators

### **Content Organization Hierarchy**

```
Central Content Registry
├── Content Library (Images/Videos)
│   ├── Individual Content Items
│   │   ├── Categories: ["fashion", "lifestyle", "summer"]
│   │   ├── Tags: ["outfit", "trendy", "casual"]
│   │   └── Bundle Assignments: [Bundle1, Bundle2]
│   └── Batch Operations
├── Content Bundles
│   ├── Bundle Creation/Management
│   ├── Bundle Contents View
│   └── Bundle Assignment Operations
└── Text Library
    ├── Text Content Items
    │   ├── Categories: ["bio", "post", "story"]
    │   ├── Template Names
    │   └── Language Settings
    └── Text Management Operations
```

### **Integration with Model Content Management**

#### **Bundle Selection Interface**
Models can now select content from two sources:
1. **Model-Specific Content**: Traditional model-only content
2. **Central Content Bundles**: Shared content bundles from central registry

```typescript
interface ModelContentSource {
  type: 'model_content' | 'central_bundles';
  source_id?: number; // Bundle ID for central bundles
  content_items: ContentItem[];
}
```

#### **Content Assignment Priority**
1. **Bundle Content**: Content from assigned bundles (higher priority)
2. **Model Content**: Model-specific content (fallback)
3. **Template Content**: Default template content (last resort)

## **Content Assignment Algorithms**

### **Enhanced Assignment Logic with Bundle Support**

#### **Step 1: Content Source Selection**
```typescript
const getContentForAssignment = async (accountId: number, modelId: number, contentType: string) => {
  // 1. Check for assigned bundles
  const bundles = await getModelBundles(modelId);
  if (bundles.length > 0) {
    const bundleContent = await getBundleContent(bundles, contentType);
    if (bundleContent.length > 0) {
      return selectFromBundleContent(bundleContent, accountId);
    }
  }
  
  // 2. Fallback to model-specific content
  const modelContent = await getModelContent(modelId, contentType);
  if (modelContent.length > 0) {
    return selectFromModelContent(modelContent, accountId);
  }
  
  // 3. Use template content as last resort
  return getTemplateContent(contentType);
};
```

### **Warm-up Content Assignment**

#### **Step-Specific Assignment Logic**

**Step 1: Profile Picture Assignment**
```typescript
const assignProfilePicture = async (accountId: number, modelId: number) => {
  const criteria = {
    content_type: ['pfp', 'any'],
    model_id: modelId,
    quality_score: { min: 7 },
    usage_count: { max: 10 },        // Prefer less-used content
    moderation_status: 'approved'
  };
  
  const candidates = await getContentByCriteria(criteria);
  
  // Scoring algorithm
  const scored = candidates.map(content => ({
    ...content,
    assignment_score: calculateAssignmentScore(content, account)
  }));
  
  // Select highest-scoring unused content
  return selectBestMatch(scored, account);
};

const calculateAssignmentScore = (content: Content, account: Account) => {
  let score = content.quality_score * 0.3;        // 30% quality
  score += (10 - content.usage_count) * 0.2;      // 20% freshness
  score += content.success_rate * 0.3;            // 30% performance
  score += calculateNicheMatch(content, account) * 0.2; // 20% relevance
  
  return score;
};
```

**Step 2: Bio Text Assignment**
```typescript
const assignBioText = async (accountId: number, modelId: number) => {
  const account = await getAccount(accountId);
  const existingBio = account.bio;
  
  const criteria = {
    content_type: 'bio',
    model_id: modelId,
    different_from: existingBio,      // Don't reuse same bio
    niche_match: account.location_niche,
    usage_available: true
  };
  
  const textOptions = await getTextPoolByCriteria(criteria);
  return selectTextWithVariation(textOptions, account);
};
```

**Steps 3-5: Content + Text Pairing**
```typescript
const assignContentPair = async (step: number, accountId: number) => {
  const stepConfig = {
    3: { content_type: 'highlight', text_type: 'highlight' },
    4: { content_type: 'story', text_type: 'story' },
    5: { content_type: 'post', text_type: 'post' }
  };
  
  const config = stepConfig[step];
  
  // Get image content
  const imageContent = await assignImageContent(
    accountId, config.content_type
  );
  
  // Get matching text (if image doesn't have specific text)
  const textContent = imageContent.text_content || 
    await assignTextContent(accountId, config.text_type);
  
  return {
    image: imageContent,
    text: textContent,
    combined_score: calculatePairScore(imageContent, textContent)
  };
};
```

### **Content Freshness Management**

#### **Usage Tracking**
```sql
-- Track content usage per account
CREATE TABLE content_usage_history (
  id SERIAL PRIMARY KEY,
  content_id INTEGER REFERENCES model_content(id),
  account_id INTEGER REFERENCES accounts(id),
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  step_number INTEGER,
  performance_score DECIMAL(5,2),
  
  UNIQUE(content_id, account_id, step_number)
);
```

#### **Cooldown Management**
```typescript
const isContentAvailable = async (contentId: number, accountId: number) => {
  const lastUsage = await getLastUsage(contentId, accountId);
  const cooldownPeriod = await getContentCooldown(contentId);
  
  if (!lastUsage) return true;
  
  const daysSinceUsage = daysBetween(lastUsage.used_at, new Date());
  return daysSinceUsage >= cooldownPeriod;
};
```

### **Performance-Based Optimization**

#### **Content Success Tracking**
```typescript
interface ContentPerformance {
  content_id: number;
  total_usage: number;
  successful_warmups: number;    // Accounts that completed warmup
  failed_warmups: number;        // Accounts that failed after using this
  success_rate: number;          // Calculated success percentage
  avg_step_completion_time: number; // Average time for step completion
  engagement_metrics?: {         // When available from Instagram
    likes: number;
    comments: number;
    saves: number;
    shares: number;
  };
}
```

#### **Dynamic Content Scoring**
```typescript
const updateContentScores = async () => {
  const allContent = await getAllContent();
  
  for (const content of allContent) {
    const performance = await calculatePerformance(content.id);
    
    const newScore = {
      quality_score: content.quality_score,
      performance_score: performance.success_rate,
      engagement_score: performance.engagement_metrics ? 
        calculateEngagementScore(performance.engagement_metrics) : 0,
      freshness_score: calculateFreshnessScore(content.usage_count),
      overall_score: calculateOverallScore(content, performance)
    };
    
    await updateContentScoring(content.id, newScore);
  }
};
```

## **Template System**

### **Template Creation**
```typescript
interface ContentTemplate {
  id: number;
  name: string;
  description: string;
  created_by: string;
  
  // Content Sets
  profile_pictures: number[];    // Content IDs
  bio_texts: number[];          // Text pool IDs
  highlight_content: number[];
  story_content: number[];
  post_content: number[];
  
  // Usage Rules
  is_public: boolean;           // Available to all users
  usage_count: number;
  success_rate: number;
  
  // Metadata
  niche_tags: string[];
  demographic_target: string[];
  recommended_for: string[];    // Model types
}
```

### **Template Cloning Workflow**
```typescript
const cloneTemplate = async (
  templateId: number, 
  targetModelId: number,
  options: {
    include_images: boolean;
    include_texts: boolean;
    replace_existing: boolean;
    modify_for_niche: string;
  }
) => {
  const template = await getTemplate(templateId);
  const targetModel = await getModel(targetModelId);
  
  // Clone content items
  const clonedContent = await Promise.all([
    cloneContentItems(template.profile_pictures, targetModelId),
    cloneTextItems(template.bio_texts, targetModelId),
    cloneContentItems(template.highlight_content, targetModelId),
    cloneContentItems(template.story_content, targetModelId),
    cloneContentItems(template.post_content, targetModelId)
  ]);
  
  // Apply niche modifications if requested
  if (options.modify_for_niche) {
    await applyNicheModifications(clonedContent, options.modify_for_niche);
  }
  
  return {
    cloned_items: clonedContent.flat().length,
    success: true,
    template_usage_id: await recordTemplateUsage(templateId, targetModelId)
  };
};
```

## **Content Quality Assurance**

### **Automated Quality Checks**
```typescript
interface QualityChecks {
  // Image Quality
  resolution: { min: { width: 1080, height: 1080 } };
  file_size: { min: 100_000, max: 10_000_000 }; // bytes
  format: ['jpg', 'jpeg', 'png'];
  brightness: { min: 20, max: 95 };             // percentage
  contrast: { min: 15 };
  
  // Content Appropriateness
  contains_faces: boolean;                       // For profile pics
  contains_text: boolean;                        // OCR detection
  brand_safety: 'safe' | 'moderate' | 'unsafe';
  duplicate_similarity: { max: 0.9 };           // Image similarity
  
  // Text Quality
  length_limits: {
    bio: { max: 150 },
    post: { max: 2200 },
    story: { max: 500 }
  };
  language_detection: boolean;
  spelling_check: boolean;
  banned_words: string[];
}
```

### **Manual Review Queue**
```typescript
interface ReviewQueueItem {
  content_id: number;
  content_type: ContentType;
  flagged_reason: string[];
  uploaded_by: string;
  uploaded_at: Date;
  auto_score: number;
  requires_review: boolean;
  reviewer_notes?: string;
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_changes';
}
```

## **Content Analytics**

### **Performance Metrics**
```typescript
interface ContentAnalytics {
  // Usage Statistics
  total_content_items: number;
  content_by_type: Record<ContentType, number>;
  average_usage_per_item: number;
  most_used_content: ContentItem[];
  least_used_content: ContentItem[];
  
  // Performance Metrics
  warmup_success_rate_by_content: Record<number, number>;
  content_effectiveness_scores: Record<number, number>;
  best_performing_content: ContentItem[];
  underperforming_content: ContentItem[];
  
  // Trends
  content_usage_trends: TimeSeriesData[];
  success_rate_trends: TimeSeriesData[];
  content_freshness_distribution: Distribution;
  
  // Recommendations
  content_gaps: string[];           // Missing content types/niches
  recommended_uploads: Recommendation[];
  optimization_suggestions: Suggestion[];
}
```

### **Reporting Dashboard**
```typescript
interface ContentDashboard {
  // Overview Cards
  total_active_content: number;
  content_utilization_rate: number;
  average_content_score: number;
  pending_review_count: number;
  
  // Charts
  content_performance_chart: ChartData;
  usage_distribution_chart: ChartData;
  success_rate_by_type_chart: ChartData;
  content_freshness_chart: ChartData;
  
  // Tables
  top_performing_content: ContentItem[];
  recent_uploads: ContentItem[];
  review_queue: ReviewQueueItem[];
  low_stock_alerts: StockAlert[];
}
```

## **Content Optimization Strategies**

### **A/B Testing Framework**
```typescript
interface ContentABTest {
  test_id: string;
  test_name: string;
  content_variants: number[];       // Content IDs being tested
  test_criteria: {
    warmup_success_rate: boolean;
    step_completion_time: boolean;
    engagement_metrics: boolean;
  };
  sample_size: number;              // Accounts in test
  confidence_level: number;         // Statistical significance
  test_duration: number;            // Days
  current_results: ABTestResults;
}
```

### **Dynamic Content Rotation**
```typescript
const optimizeContentRotation = async (modelId: number) => {
  const contentPerformance = await getContentPerformance(modelId);
  const lowPerformers = contentPerformance.filter(c => c.success_rate < 0.7);
  const topPerformers = contentPerformance.filter(c => c.success_rate > 0.9);
  
  // Reduce usage of low performers
  await updateContentPriority(lowPerformers, 'decrease');
  
  // Increase usage of top performers (but maintain freshness)
  await updateContentPriority(topPerformers, 'increase');
  
  // Suggest new content creation for gaps
  const gaps = await identifyContentGaps(modelId);
  return generateContentRecommendations(gaps);
};
```

### **Seasonal Content Management**
```typescript
const activateSeasonalContent = async (season: string) => {
  // Activate seasonal content
  await updateContentStatus(
    { seasonal_tags: season },
    { priority_multiplier: 1.5, active: true }
  );
  
  // Deactivate out-of-season content
  const outOfSeason = getOppositeSeasons(season);
  await updateContentStatus(
    { seasonal_tags: outOfSeason },
    { priority_multiplier: 0.5, suggested_only: true }
  );
};
``` 