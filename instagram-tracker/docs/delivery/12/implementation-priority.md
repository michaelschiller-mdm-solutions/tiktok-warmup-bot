# Implementation Priority: Central Content System Updates

## Critical Gap Analysis

### Current System State
- ✅ **Warmup Content System**: Fully functional with `central_content` and `central_text_content`
- ✅ **Bot API for Warmup**: Complete endpoints for warmup phases
- ❌ **Post-Warmup Content**: No content system after `is_warmup_complete(account_id) = true`
- ❌ **Sprint Bot Endpoints**: No API endpoints for sprint content selection

### Core Problem
**Accounts transition to 'active' state after warmup completion but have no content selection mechanism for ongoing posting!**

## Phase 1: CRITICAL (Must Implement First)

### 1.1 New Bot API Endpoints for Sprint Content
**Priority: HIGHEST - System is broken without these**

```typescript
// New endpoints needed in /api/bot/accounts/
POST   /api/bot/accounts/:id/get-sprint-content    // Get next content from active sprints
POST   /api/bot/accounts/:id/get-emergency-content // Get emergency content
POST   /api/bot/accounts/:id/get-highlight-content // Get highlight maintenance content
GET    /api/bot/accounts/active                    // Get accounts ready for sprint posting
```

### 1.2 Sprint Content Selection Functions
**Priority: HIGHEST - Required for bot endpoints**

```sql
-- Critical functions needed immediately
CREATE FUNCTION get_next_sprint_content(account_id INTEGER)
CREATE FUNCTION get_emergency_content(account_id INTEGER, conflict_strategy VARCHAR)
CREATE FUNCTION get_highlight_maintenance_content(account_id INTEGER)
```

### 1.3 Content Queue Integration
**Priority: HIGHEST - Bot needs to know what to post when**

```sql
-- Update content_queue to reference central content
ALTER TABLE content_queue 
ADD COLUMN central_content_id INTEGER REFERENCES central_content(id),
ADD COLUMN central_text_id INTEGER REFERENCES central_text_content(id);
```

## Phase 2: HIGH PRIORITY (Implement Within 1 Week)

### 2.1 Sprint-Compatible Categories
**Priority: HIGH - Needed for realistic content variation**

Add to existing content:
```json
// Location categories
["jamaica", "germany", "home", "university", "work", "gym", "beach"]

// Theme categories  
["vacation", "university_life", "work_life", "fitness", "lifestyle"]

// Seasonal categories
["spring", "summer", "fall", "winter"]
```

### 2.2 Emergency Content Tagging
**Priority: HIGH - Emergency system needs this**

```sql
ALTER TABLE central_content ADD COLUMN emergency_compatible BOOLEAN DEFAULT false;
ALTER TABLE central_text_content ADD COLUMN emergency_compatible BOOLEAN DEFAULT false;
```

### 2.3 Post-Warmup Account Initialization
**Priority: HIGH - Accounts get stuck without this**

```sql
-- Trigger to initialize sprint system when warmup completes
CREATE TRIGGER trigger_initialize_sprint_system
AFTER UPDATE ON accounts 
FOR EACH ROW 
WHEN (is_warmup_complete(NEW.id) AND NOT is_warmup_complete(OLD.id))
EXECUTE FUNCTION initialize_post_warmup_account(NEW.id);
```

## Phase 3: MEDIUM PRIORITY (Implement Within 2 Weeks)

### 3.1 Enhanced Content Metadata
**Priority: MEDIUM - Improves content realism**

```sql
-- Location and timing metadata
ALTER TABLE central_content ADD COLUMN location_data JSONB DEFAULT '{}';
ALTER TABLE central_content ADD COLUMN timing_constraints JSONB DEFAULT '{}';
ALTER TABLE central_content ADD COLUMN sprint_compatibility JSONB DEFAULT '{}';
```

### 3.2 Seasonal Content Filtering
**Priority: MEDIUM - Prevents unrealistic posts (beach in winter)**

```sql
CREATE FUNCTION select_content_for_sprint(
  p_sprint_id INTEGER,
  p_content_category VARCHAR(50),
  p_current_season VARCHAR(20)
) RETURNS content_with_metadata;
```

### 3.3 Conflict Detection for Emergency Content
**Priority: MEDIUM - Prevents posting conflicts**

```sql
CREATE FUNCTION detect_location_conflicts(
  p_account_id INTEGER,
  p_emergency_content_id INTEGER
) RETURNS conflict_resolution_strategy;
```

## Phase 4: LOW PRIORITY (Future Enhancements)

### 4.1 Advanced Bundle System
- Location-themed bundles
- Seasonal content bundles
- Sprint-specific bundles

### 4.2 Quality Scoring for Sprint Content
- Usage frequency tracking
- Success rate monitoring  
- Dynamic quality adjustment

### 4.3 Machine Learning Content Recommendations
- Account behavior analysis
- Optimal posting time prediction
- Content performance optimization

## Implementation Order

### Week 1: Get System Working
1. **Day 1-2**: Implement bot API endpoints for sprint content
2. **Day 3-4**: Create sprint content selection functions
3. **Day 5-7**: Update content queue integration and test warmup→sprint transition

### Week 2: Add Content Variety
1. **Day 1-3**: Add sprint-compatible categories to existing content
2. **Day 4-5**: Implement emergency content system
3. **Day 6-7**: Test full sprint workflow with realistic content

### Week 3-4: Enhanced Features
1. Add metadata and seasonal filtering
2. Implement conflict detection
3. Create location-themed bundles
4. Performance optimization

## Success Criteria

### Week 1 Success Metrics
- [ ] Bot can get content for post-warmup accounts
- [ ] Emergency content system works
- [ ] No disruption to existing warmup flow
- [ ] Accounts transition smoothly from warmup to sprint system

### Week 2 Success Metrics  
- [ ] Content varies realistically by location/theme
- [ ] Emergency content handles conflicts properly
- [ ] Highlight maintenance works automatically
- [ ] Sprint content doesn't conflict with warmup content

### Critical Dependencies

1. **Sprint Database Schema**: Must be implemented first (already done in task 12-1)
2. **Content Categories**: Must define sprint categories before content selection
3. **Account State Management**: Must track account location and active sprints
4. **Bot Authentication**: Must extend existing bot auth to cover sprint endpoints

## Risk Mitigation

### High Risk: Breaking Warmup System
- **Mitigation**: All changes are additive, no modifications to existing warmup code
- **Testing**: Comprehensive warmup testing before any sprint updates

### Medium Risk: Content Selection Performance
- **Mitigation**: Index all new JSONB columns for fast category queries
- **Testing**: Load test with 1000+ content items

### Low Risk: Category Management
- **Mitigation**: Create category management UI for content teams
- **Fallback**: Manual SQL updates for urgent category changes

## Resource Requirements

### Development Time
- **Phase 1**: 5-7 days (critical path)
- **Phase 2**: 5-7 days  
- **Phase 3**: 7-10 days
- **Phase 4**: 14+ days (optional)

### Testing Requirements
- Unit tests for all new content selection functions
- Integration tests for warmup→sprint transition
- Load tests for content selection performance
- End-to-end tests with bot automation

### Content Team Requirements
- Define sprint categories for existing content
- Tag emergency-compatible content
- Create location-themed content collections
- Seasonal content review and tagging 