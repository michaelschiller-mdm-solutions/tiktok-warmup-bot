# API Specification - Instagram Automation Platform

## Overview
Complete REST API documentation for the Instagram account management platform, including all endpoints for account lifecycle management, proxy management, content management, and bot integration.

## **Base Configuration**
- **Base URL**: `https://api.instagram-platform.com/api/v1`
- **Authentication**: Bearer token authentication
- **Content Type**: `application/json`
- **Rate Limiting**: 1000 requests/hour per API key

## **Response Format Standards**

### **Success Response**
```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "timestamp": "2025-01-20T21:45:00Z",
    "request_id": "req_123456789"
  }
}
```

### **Error Response**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "username",
      "issue": "Username already exists"
    }
  },
  "meta": {
    "timestamp": "2025-01-20T21:45:00Z",
    "request_id": "req_123456789"
  }
}
```

## **1. Model Management APIs**

### **GET /models**
Retrieve all models with optional filtering
```http
GET /models?status=active&limit=20&offset=0
```
**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": 1,
        "name": "Fashion Influencer Campaign",
        "status": "active",
        "total_accounts": 150,
        "active_accounts": 142,
        "unfollow_ratio": 90,
        "daily_follow_limit": 50,
        "created_at": "2025-01-15T10:00:00Z"
      }
    ],
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

### **GET /models/:id**
Get specific model details
```http
GET /models/1
```

### **PUT /models/:id**
Update model configuration
```http
PUT /models/1
Content-Type: application/json

{
  "name": "Updated Campaign Name",
  "unfollow_ratio": 85,
  "daily_follow_limit": 75
}
```

## **2. Account Management APIs**

### **GET /models/:id/accounts**
Get accounts for specific model with filtering
```http
GET /models/1/accounts?lifecycle_state=active&limit=50&offset=0
```
**Response:**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": 101,
        "username": "fashion_user_01",
        "email": "user01@example.com",
        "status": "active",
        "lifecycle_state": "active",
        "warmup_step": null,
        "proxy_id": 5,
        "last_bot_action_at": "2025-01-20T15:30:00Z",
        "requires_human_review": false,
        "created_at": "2025-01-15T08:00:00Z"
      }
    ],
    "summary": {
      "total": 150,
      "by_lifecycle_state": {
        "imported": 5,
        "warming_up": 12,
        "ready": 8,
        "active": 120,
        "human_review": 3,
        "cleanup": 2
      }
    }
  }
}
```

### **POST /accounts/import**
Bulk import accounts from file
```http
POST /accounts/import
Content-Type: multipart/form-data

file: accounts.txt
model_id: 1
```
**Response:**
```json
{
  "success": true,
  "data": {
    "imported_count": 45,
    "skipped_count": 5,
    "errors": [
      {
        "line": 12,
        "error": "Invalid email format",
        "data": "user12,invalid-email,password123"
      }
    ],
    "import_id": "import_123456789"
  }
}
```

### **PUT /accounts/:id/lifecycle**
Update account lifecycle state
```http
PUT /accounts/101/lifecycle
Content-Type: application/json

{
  "lifecycle_state": "ready",
  "reason": "warmup_completed",
  "metadata": {
    "completed_steps": [1, 2, 3, 4, 5],
    "completion_time": "2025-01-20T21:45:00Z"
  }
}
```

### **PUT /accounts/:id/reassign**
Reassign account to different model
```http
PUT /accounts/101/reassign
Content-Type: application/json

{
  "new_model_id": 2,
  "cleanup_required": true,
  "reason": "campaign_reallocation"
}
```

### **GET /accounts/warmup-queue**
Get accounts ready for warm-up process
```http
GET /accounts/warmup-queue?bot_id=bot_001&limit=10
```

## **3. Proxy Management APIs**

### **GET /proxies**
List all proxies with utilization info
```http
GET /proxies?status=active&available_slots=true
```
**Response:**
```json
{
  "success": true,
  "data": {
    "proxies": [
      {
        "id": 5,
        "ip": "192.168.1.100",
        "port": 8080,
        "provider": "ProxyProvider Inc",
        "location": "New York, US",
        "status": "active",
        "account_count": 2,
        "max_accounts": 3,
        "available_slots": 1,
        "monthly_cost": 29.99,
        "assigned_model_id": 1,
        "last_tested_at": "2025-01-20T20:00:00Z"
      }
    ]
  }
}
```

### **POST /proxies**
Add new proxy
```http
POST /proxies
Content-Type: application/json

{
  "ip": "192.168.1.101",
  "port": 8080,
  "username": "proxy_user",
  "password": "proxy_pass",
  "provider": "ProxyProvider Inc",
  "location": "Los Angeles, US",
  "monthly_cost": 29.99
}
```

### **POST /proxies/assign**
Manually assign proxy to account
```http
POST /proxies/assign
Content-Type: application/json

{
  "proxy_id": 5,
  "account_id": 101,
  "force": false
}
```

### **GET /proxies/utilization**
Get proxy utilization analytics
```http
GET /proxies/utilization?timeframe=7d&model_id=1
```

## **4. Content Management APIs**

### **POST /models/:id/content**
Upload content for model
```http
POST /models/1/content
Content-Type: multipart/form-data

file: profile_pic.jpg
content_type: pfp
text_content: "Fresh new look! #style #fashion"
is_template: true
```

### **GET /models/:id/content**
Get all content for model
```http
GET /models/1/content?content_type=pfp&is_template=true
```

### **POST /models/:id/text-pools**
Add text to content pool
```http
POST /models/1/text-pools
Content-Type: application/json

{
  "content_type": "bio",
  "text_content": "Fashion enthusiast | Style inspiration | DM for collabs",
  "is_template": true
}
```

### **POST /templates/clone**
Clone content template to another model
```http
POST /templates/clone
Content-Type: application/json

{
  "source_model_id": 1,
  "target_model_id": 2,
  "content_types": ["pfp", "post"],
  "include_text_pools": true
}
```

## **4.1. Central Content Registry APIs**

### **GET /central/content**
Get all central content with filtering
```http
GET /central/content?content_type=image&categories=fashion&limit=50&offset=0
```
**Response:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "filename": "fashion_pic_001.jpg",
        "original_name": "stylish_outfit.jpg",
        "content_type": "image",
        "file_size": 2048576,
        "categories": ["fashion", "lifestyle"],
        "tags": ["outfit", "style", "trendy"],
        "status": "active",
        "created_at": "2025-01-20T10:00:00Z"
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

### **POST /central/content/upload**
Upload content to central registry
```http
POST /central/content/upload
Content-Type: multipart/form-data

files: [file1.jpg, file2.jpg]
global_categories: ["fashion", "lifestyle"]
global_tags: ["trendy", "style"]
file_settings: {
  "file1.jpg": {
    "categories": ["fashion"],
    "tags": ["outfit"],
    "bundle_assignments": [1, 2]
  }
}
```

### **PUT /central/content/:id**
Update central content metadata
```http
PUT /central/content/1
Content-Type: application/json

{
  "categories": ["fashion", "lifestyle", "summer"],
  "tags": ["outfit", "style", "trendy", "seasonal"],
  "status": "active"
}
```

### **DELETE /central/content/:id**
Delete central content
```http
DELETE /central/content/1
```

### **GET /central/text-content**
Get all central text content
```http
GET /central/text-content?categories=bio&template_name=fashion
```
**Response:**
```json
{
  "success": true,
  "data": {
    "text_content": [
      {
        "id": 1,
        "text_content": "Fashion enthusiast | Style inspiration | DM for collabs",
        "categories": ["bio", "fashion"],
        "tags": ["professional", "collaboration"],
        "template_name": "Fashion Bio Template",
        "language": "en",
        "status": "active",
        "created_at": "2025-01-20T10:00:00Z"
      }
    ]
  }
}
```

### **POST /central/text-content**
Create new text content
```http
POST /central/text-content
Content-Type: application/json

{
  "text_content": "New day, new outfit! What's your style inspiration today?",
  "categories": ["post", "fashion"],
  "tags": ["daily", "inspiration"],
  "template_name": "Daily Fashion Post",
  "language": "en"
}
```

### **PUT /central/text-content/:id**
Update text content
```http
PUT /central/text-content/1
Content-Type: application/json

{
  "text_content": "Updated fashion bio text",
  "categories": ["bio", "fashion", "lifestyle"],
  "tags": ["professional", "updated"]
}
```

### **DELETE /central/text-content/:id**
Delete text content
```http
DELETE /central/text-content/1
```

## **4.2. Content Bundle Management APIs**

### **GET /central/bundles**
Get all content bundles
```http
GET /central/bundles?bundle_type=mixed&categories=fashion
```
**Response:**
```json
{
  "success": true,
  "data": {
    "bundles": [
      {
        "id": 1,
        "name": "Fashion Starter Pack",
        "description": "Complete content bundle for fashion accounts",
        "bundle_type": "mixed",
        "categories": ["fashion", "lifestyle"],
        "tags": ["starter", "complete"],
        "status": "active",
        "content_count": 15,
        "text_count": 8,
        "created_at": "2025-01-20T10:00:00Z"
      }
    ]
  }
}
```

### **POST /central/bundles**
Create new content bundle
```http
POST /central/bundles
Content-Type: application/json

{
  "name": "Summer Fashion Bundle",
  "description": "Seasonal content for summer fashion campaigns",
  "bundle_type": "mixed",
  "categories": ["fashion", "summer"],
  "tags": ["seasonal", "trendy"]
}
```

### **PUT /central/bundles/:id**
Update bundle metadata
```http
PUT /central/bundles/1
Content-Type: application/json

{
  "name": "Updated Fashion Bundle",
  "description": "Updated description",
  "categories": ["fashion", "lifestyle", "summer"]
}
```

### **DELETE /central/bundles/:id**
Delete content bundle
```http
DELETE /central/bundles/1
```

### **GET /central/bundles/:id/contents**
Get bundle contents with details
```http
GET /central/bundles/1/contents
```
**Response:**
```json
{
  "success": true,
  "data": {
    "bundle": {
      "id": 1,
      "name": "Fashion Starter Pack",
      "description": "Complete content bundle for fashion accounts"
    },
    "contents": [
      {
        "assignment_id": 101,
        "content_type": "image",
        "content_id": 5,
        "filename": "fashion_pic_001.jpg",
        "categories": ["fashion"],
        "assignment_order": 1
      },
      {
        "assignment_id": 102,
        "content_type": "text",
        "text_content_id": 3,
        "text_content": "Fashion enthusiast bio",
        "categories": ["bio"],
        "assignment_order": 2
      }
    ]
  }
}
```

### **POST /central/bundles/:id/add-content**
Add single item to bundle
```http
POST /central/bundles/1/add-content
Content-Type: application/json

{
  "content_id": 5,
  "assignment_order": 10
}
```

### **POST /central/bundles/:id/add-content/batch**
Batch add items to bundle
```http
POST /central/bundles/1/add-content/batch
Content-Type: application/json

{
  "content_ids": [5, 6, 7],
  "text_content_ids": [3, 4],
  "assignment_order_start": 10
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "type": "content",
        "id": 5,
        "success": true,
        "assignment_id": 105
      },
      {
        "type": "content", 
        "id": 6,
        "success": false,
        "error": "Already assigned to this bundle"
      }
    ],
    "summary": {
      "total_attempted": 5,
      "successful": 4,
      "failed": 1
    }
  }
}
```

### **DELETE /central/bundles/:id/content/:assignmentId**
Remove item from bundle
```http
DELETE /central/bundles/1/content/105
```

## **4.3. Model Bundle Integration APIs**

### **GET /central/models/:id/bundles**
Get available bundles for model content selection
```http
GET /central/models/1/bundles?categories=fashion
```
**Response:**
```json
{
  "success": true,
  "data": {
    "bundles": [
      {
        "id": 1,
        "name": "Fashion Starter Pack",
        "description": "Complete content bundle for fashion accounts",
        "content_count": 15,
        "text_count": 8,
        "categories": ["fashion", "lifestyle"],
        "preview_items": [
          {
            "type": "image",
            "filename": "fashion_pic_001.jpg"
          },
          {
            "type": "text",
            "text_preview": "Fashion enthusiast | Style..."
          }
        ]
      }
    ]
  }
}
```

## **5. Warm-up Process APIs**

### **GET /accounts/:id/warmup-steps**
Get warm-up progress for account
```http
GET /accounts/101/warmup-steps
```
**Response:**
```json
{
  "success": true,
  "data": {
    "account_id": 101,
    "current_step": 3,
    "steps": [
      {
        "step_number": 1,
        "step_name": "change_pfp",
        "status": "completed",
        "started_at": "2025-01-18T10:00:00Z",
        "completed_at": "2025-01-18T10:05:00Z",
        "bot_id": "bot_001",
        "execution_time_ms": 12500
      },
      {
        "step_number": 2,
        "step_name": "change_bio",
        "status": "completed",
        "started_at": "2025-01-19T10:00:00Z",
        "completed_at": "2025-01-19T10:03:00Z",
        "bot_id": "bot_001",
        "execution_time_ms": 8200
      },
      {
        "step_number": 3,
        "step_name": "post_highlight",
        "status": "in_progress",
        "started_at": "2025-01-20T10:00:00Z",
        "bot_id": "bot_002"
      }
    ]
  }
}
```

### **GET /accounts/human-review**
Get accounts requiring human review
```http
GET /accounts/human-review?model_id=1&limit=20
```

## **6. Bot Integration APIs**

### **GET /bot/next-task/:bot_id**
Get next task for bot to execute
```http
GET /bot/next-task/bot_001
```
**Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "task_123456",
    "account_id": 101,
    "account": {
      "username": "fashion_user_01",
      "password": "encrypted_password_hash"
    },
    "proxy": {
      "ip": "192.168.1.100",
      "port": 8080,
      "username": "proxy_user",
      "password": "encrypted_proxy_pass"
    },
    "step": {
      "step_number": 3,
      "step_name": "post_highlight",
      "content": {
        "image_url": "https://cdn.platform.com/content/img_123.jpg",
        "text": "Amazing highlight content! #lifestyle"
      }
    },
    "expected_completion": "2025-01-20T22:00:00Z"
  }
}
```

### **POST /bot/step-complete**
Mark step as completed
```http
POST /bot/step-complete
Content-Type: application/json

{
  "task_id": "task_123456",
  "account_id": 101,
  "step_number": 3,
  "bot_id": "bot_001",
  "execution_time_ms": 15300,
  "instagram_response": {
    "success": true,
    "post_id": "highlight_12345",
    "timestamp": "2025-01-20T21:55:00Z"
  }
}
```

### **POST /bot/step-failed**
Report step failure
```http
POST /bot/step-failed
Content-Type: application/json

{
  "task_id": "task_123456",
  "account_id": 101,
  "step_number": 3,
  "bot_id": "bot_001",
  "error_message": "Instagram blocked the action",
  "error_details": {
    "error_type": "rate_limit",
    "retry_after": 3600,
    "instagram_error": "Please wait before trying again"
  },
  "screenshots": ["error_screenshot_url"]
}
```

### **GET /bot/account/:id/content**
Get content for specific step
```http
GET /bot/account/101/content?step_name=post_highlight&content_type=any
```

### **PUT /bot/heartbeat/:bot_id**
Bot status update
```http
PUT /bot/heartbeat/bot_001
Content-Type: application/json

{
  "status": "active",
  "current_task": "task_123456",
  "accounts_processed_today": 25,
  "last_error": null,
  "system_info": {
    "cpu_usage": 45,
    "memory_usage": 2.1,
    "iphone_connected": true
  }
}
```

## **7. Analytics APIs**

### **GET /analytics/dashboard/:model_id**
Get dashboard analytics for model
```http
GET /analytics/dashboard/1?timeframe=7d
```

### **GET /analytics/warmup-success-rates**
Get warm-up step success rates
```http
GET /analytics/warmup-success-rates?model_id=1&timeframe=30d
```

### **GET /analytics/proxy-utilization**
Get proxy utilization analytics
```http
GET /analytics/proxy-utilization?timeframe=30d
```

## **8. Import/Export APIs**

### **GET /export/accounts**
Export account data
```http
GET /export/accounts?model_id=1&format=csv&include_sensitive=false
```

### **POST /import/validate**
Validate import file before processing
```http
POST /import/validate
Content-Type: multipart/form-data

file: accounts.txt
type: accounts
```

## **Error Codes**

### **Authentication Errors (401)**
- `AUTH_TOKEN_MISSING` - Authorization header missing
- `AUTH_TOKEN_INVALID` - Invalid or expired token
- `AUTH_INSUFFICIENT_PERMISSIONS` - User lacks required permissions

### **Validation Errors (400)**
- `VALIDATION_ERROR` - Request data validation failed
- `DUPLICATE_ENTRY` - Attempting to create duplicate record
- `INVALID_STATE_TRANSITION` - Invalid lifecycle state change

### **Resource Errors (404)**
- `MODEL_NOT_FOUND` - Specified model doesn't exist
- `ACCOUNT_NOT_FOUND` - Specified account doesn't exist
- `PROXY_NOT_FOUND` - Specified proxy doesn't exist

### **Business Logic Errors (422)**
- `PROXY_CAPACITY_EXCEEDED` - Proxy already has maximum accounts
- `WARMUP_SEQUENCE_VIOLATION` - Invalid warm-up step sequence
- `ACCOUNT_NOT_READY` - Account not in correct state for operation

### **Rate Limiting (429)**
- `RATE_LIMIT_EXCEEDED` - API rate limit exceeded
- `BOT_RATE_LIMIT` - Bot-specific rate limit exceeded

## **Rate Limiting**

### **General API Limits**
- **Standard User**: 1,000 requests/hour
- **Bot API**: 10,000 requests/hour per bot
- **Import Operations**: 10 imports/hour

### **Bot-Specific Limits**
- **Task Requests**: 1 request/second per bot
- **Heartbeat**: 1 request/minute per bot
- **Error Reporting**: 100 requests/hour per bot

## **Authentication**

### **API Key Authentication**
```http
Authorization: Bearer your_api_key_here
```

### **Bot Authentication**
```http
Authorization: Bot bot_id:bot_secret_key
```

## **Webhooks** (Future)

### **Account State Changes**
```json
{
  "event": "account.lifecycle.changed",
  "data": {
    "account_id": 101,
    "from_state": "warming_up",
    "to_state": "ready",
    "timestamp": "2025-01-20T21:45:00Z"
  }
}
```

### **Warmup Step Completion**
```json
{
  "event": "warmup.step.completed",
  "data": {
    "account_id": 101,
    "step_number": 5,
    "step_name": "post_post",
    "bot_id": "bot_001",
    "timestamp": "2025-01-20T21:45:00Z"
  }
}
``` 