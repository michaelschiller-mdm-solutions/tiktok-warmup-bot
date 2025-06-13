# Testing Strategy - Instagram Automation Platform

## Overview
Comprehensive testing strategy for the Instagram automation platform, covering unit tests, integration tests, end-to-end testing, performance testing, and bot API testing to ensure reliability, scalability, and accuracy across all platform components.

## **Testing Philosophy**

### **Test Pyramid Approach**
```
        🔺 E2E Tests (10%)
       🔺🔺 Integration Tests (20%)  
    🔺🔺🔺🔺 Unit Tests (70%)
```

- **Unit Tests (70%)**: Fast, isolated component testing
- **Integration Tests (20%)**: API and database interaction testing  
- **E2E Tests (10%)**: Full user workflow testing

### **Core Testing Principles**
1. **Reliability**: Tests must be deterministic and stable
2. **Performance**: Test suite runs in under 10 minutes
3. **Coverage**: Minimum 80% code coverage across all modules
4. **Maintainability**: Tests are easy to read and update
5. **Real-world Scenarios**: Tests reflect actual usage patterns

## **Testing Categories**

### **1. Unit Testing**

#### **Frontend Component Testing**
```typescript
// DataGrid Component Tests
describe('DataGrid Component', () => {
  describe('Rendering', () => {
    test('renders empty state correctly', () => {
      render(<DataGrid data={[]} columns={mockColumns} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    test('renders data rows correctly', () => {
      render(<DataGrid data={mockAccounts} columns={mockColumns} />);
      expect(screen.getAllByRole('row')).toHaveLength(mockAccounts.length + 1); // +1 for header
    });

    test('applies custom row height', () => {
      render(<DataGrid data={mockAccounts} columns={mockColumns} rowHeight={50} />);
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveStyle('height: 50px');
    });
  });

  describe('Selection', () => {
    test('handles single row selection', () => {
      const onSelectionChange = jest.fn();
      render(
        <DataGrid 
          data={mockAccounts} 
          columns={mockColumns} 
          onSelectionChange={onSelectionChange}
        />
      );
      
      fireEvent.click(screen.getByText('account_1'));
      expect(onSelectionChange).toHaveBeenCalledWith({
        type: 'row',
        selectedRows: new Set(['1'])
      });
    });

    test('handles multi-row selection with Ctrl+Click', () => {
      const onSelectionChange = jest.fn();
      render(<DataGrid data={mockAccounts} columns={mockColumns} onSelectionChange={onSelectionChange} />);
      
      fireEvent.click(screen.getByText('account_1'));
      fireEvent.click(screen.getByText('account_2'), { ctrlKey: true });
      
      expect(onSelectionChange).toHaveBeenLastCalledWith({
        type: 'row',
        selectedRows: new Set(['1', '2'])
      });
    });
  });

  describe('Keyboard Navigation', () => {
    test('moves selection down with ArrowDown', () => {
      render(<DataGrid data={mockAccounts} columns={mockColumns} />);
      const grid = screen.getByRole('grid');
      
      fireEvent.keyDown(grid, { key: 'ArrowDown' });
      expect(screen.getByText('account_1')).toHaveClass('selected');
    });

    test('handles Ctrl+A for select all', () => {
      const onSelectionChange = jest.fn();
      render(<DataGrid data={mockAccounts} columns={mockColumns} onSelectionChange={onSelectionChange} />);
      
      fireEvent.keyDown(screen.getByRole('grid'), { key: 'a', ctrlKey: true });
      expect(onSelectionChange).toHaveBeenCalledWith({
        type: 'row',
        selectedRows: new Set(['1', '2', '3'])
      });
    });
  });

  describe('Performance', () => {
    test('renders large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        username: `user_${i}`,
        status: 'active'
      }));
      
      const startTime = performance.now();
      render(<DataGrid data={largeDataset} columns={mockColumns} virtualScrolling />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render in <100ms
    });
  });
});
```

#### **Hook Testing**
```typescript
// useDataGrid Hook Tests
describe('useDataGrid Hook', () => {
  test('initializes with correct default state', () => {
    const { result } = renderHook(() => useDataGrid({
      data: mockAccounts,
      columns: mockColumns
    }));

    expect(result.current.selection).toEqual({
      type: 'none',
      selectedRows: new Set(),
      selectedColumns: new Set(),
      selectedCells: new Set()
    });
  });

  test('handles row selection correctly', () => {
    const { result } = renderHook(() => useDataGrid({
      data: mockAccounts,
      columns: mockColumns
    }));

    act(() => {
      result.current.selectRow('1');
    });

    expect(result.current.selection.selectedRows).toContain('1');
  });

  test('calculates visible rows for virtual scrolling', () => {
    const { result } = renderHook(() => useDataGrid({
      data: mockAccounts,
      columns: mockColumns,
      virtualScrolling: true,
      containerHeight: 400,
      rowHeight: 40
    }));

    expect(result.current.visibleRows).toHaveLength(12); // 400/40 + buffer
  });
});
```

#### **Utility Function Testing**
```typescript
// Account Lifecycle State Tests
describe('Account Lifecycle Utils', () => {
  describe('validateStateTransition', () => {
    test('allows valid transitions', () => {
      expect(validateStateTransition('imported', 'proxy_assigned')).toBe(true);
      expect(validateStateTransition('warming_up', 'ready')).toBe(true);
      expect(validateStateTransition('warming_up', 'human_review')).toBe(true);
    });

    test('rejects invalid transitions', () => {
      expect(validateStateTransition('imported', 'ready')).toBe(false);
      expect(validateStateTransition('ready', 'imported')).toBe(false);
      expect(validateStateTransition('active', 'warming_up')).toBe(false);
    });
  });

  describe('calculateWarmupProgress', () => {
    test('calculates progress correctly', () => {
      const steps = [
        { step_number: 1, status: 'completed' },
        { step_number: 2, status: 'completed' },
        { step_number: 3, status: 'in_progress' }
      ];
      
      const progress = calculateWarmupProgress(steps);
      expect(progress.completedSteps).toBe(2);
      expect(progress.totalSteps).toBe(5);
      expect(progress.percentage).toBe(40);
    });
  });
});
```

### **2. Integration Testing**

#### **API Integration Tests**
```typescript
// Account Management API Tests
describe('Account Management API', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    await seedTestData();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/models/:id/accounts', () => {
    test('returns accounts for specific model', async () => {
      const response = await request(app)
        .get('/api/models/1/accounts')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accounts).toHaveLength(10);
      expect(response.body.data.summary.total).toBe(10);
    });

    test('filters accounts by lifecycle state', async () => {
      const response = await request(app)
        .get('/api/models/1/accounts?lifecycle_state=ready')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      const accounts = response.body.data.accounts;
      expect(accounts.every(acc => acc.lifecycle_state === 'ready')).toBe(true);
    });

    test('handles pagination correctly', async () => {
      const response = await request(app)
        .get('/api/models/1/accounts?limit=5&offset=0')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.data.accounts).toHaveLength(5);
      expect(response.body.data.total).toBe(10);
    });

    test('returns 404 for non-existent model', async () => {
      await request(app)
        .get('/api/models/999/accounts')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
    });
  });

  describe('POST /api/accounts/import', () => {
    test('imports valid account data', async () => {
      const csvContent = 'username,password,email\ntest1,pass1,test1@example.com\ntest2,pass2,test2@example.com';
      
      const response = await request(app)
        .post('/api/accounts/import')
        .set('Authorization', `Bearer ${validToken}`)
        .field('model_id', '1')
        .attach('file', Buffer.from(csvContent), 'accounts.csv')
        .expect(200);

      expect(response.body.data.imported_count).toBe(2);
      expect(response.body.data.errors).toHaveLength(0);
      
      // Verify accounts were created
      const accounts = await db.query('SELECT * FROM accounts WHERE username IN ($1, $2)', ['test1', 'test2']);
      expect(accounts.rows).toHaveLength(2);
    });

    test('handles duplicate usernames', async () => {
      // Create existing account
      await createTestAccount({ username: 'duplicate', email: 'dup@example.com' });
      
      const csvContent = 'username,password,email\nduplicate,pass,dup@example.com\nnew_user,pass,new@example.com';
      
      const response = await request(app)
        .post('/api/accounts/import')
        .set('Authorization', `Bearer ${validToken}`)
        .field('model_id', '1')
        .attach('file', Buffer.from(csvContent), 'accounts.csv')
        .expect(200);

      expect(response.body.data.imported_count).toBe(1);
      expect(response.body.data.skipped_count).toBe(1);
      expect(response.body.data.errors).toHaveLength(1);
    });
  });
});
```

#### **Database Integration Tests**
```typescript
// Database State Management Tests
describe('Database State Management', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  describe('Account State Transitions', () => {
    test('automatically assigns proxy on import', async () => {
      // Create available proxy
      const proxy = await createTestProxy({ account_count: 0 });
      
      // Import account
      const account = await createTestAccount({
        lifecycle_state: 'imported',
        proxy_id: null
      });

      // Trigger auto-assignment
      await autoAssignProxies();

      // Verify assignment
      const updatedAccount = await getAccount(account.id);
      expect(updatedAccount.proxy_id).toBe(proxy.id);
      expect(updatedAccount.lifecycle_state).toBe('proxy_assigned');

      // Verify proxy count updated
      const updatedProxy = await getProxy(proxy.id);
      expect(updatedProxy.account_count).toBe(1);
    });

    test('prevents proxy over-assignment', async () => {
      // Create proxy with max accounts
      const proxy = await createTestProxy({ account_count: 3 });
      
      // Try to assign another account
      const account = await createTestAccount({ lifecycle_state: 'imported' });
      
      await expect(assignProxyToAccount(account.id, proxy.id))
        .rejects.toThrow('Proxy capacity exceeded');
    });

    test('logs state transitions correctly', async () => {
      const account = await createTestAccount({ lifecycle_state: 'imported' });
      
      await updateAccountLifecycleState(account.id, 'proxy_assigned', {
        reason: 'automated_assignment',
        triggered_by: 'system'
      });

      const history = await getAccountStateHistory(account.id);
      expect(history).toHaveLength(1);
      expect(history[0].from_state).toBe('imported');
      expect(history[0].to_state).toBe('proxy_assigned');
      expect(history[0].triggered_by).toBe('system');
    });
  });

  describe('Warmup Step Logging', () => {
    test('creates step logs correctly', async () => {
      const account = await createTestAccount({ 
        lifecycle_state: 'warming_up',
        warmup_step: 1 
      });

      await createWarmupStepLog({
        account_id: account.id,
        step_number: 1,
        step_name: 'change_pfp',
        bot_id: 'bot_001',
        status: 'in_progress'
      });

      const logs = await getWarmupStepLogs(account.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].step_number).toBe(1);
      expect(logs[0].bot_id).toBe('bot_001');
    });

    test('prevents duplicate step logs', async () => {
      const account = await createTestAccount({ lifecycle_state: 'warming_up' });

      await createWarmupStepLog({
        account_id: account.id,
        step_number: 1,
        step_name: 'change_pfp'
      });

      await expect(createWarmupStepLog({
        account_id: account.id,
        step_number: 1,
        step_name: 'change_pfp'
      })).rejects.toThrow('Duplicate step log');
    });
  });
});
```

### **3. End-to-End Testing**

#### **User Workflow Tests**
```typescript
// Complete Account Management Workflow
describe('Account Management E2E', () => {
  beforeEach(async () => {
    await setupE2EEnvironment();
    await loginAsTestUser();
  });

  test('complete model account management workflow', async () => {
    // 1. Navigate to models page
    await page.goto('/models');
    await expect(page.locator('h1')).toContainText('Models');

    // 2. Click on a model card
    await page.click('[data-testid="model-card-1"]');
    await expect(page).toHaveURL('/models/1/accounts');

    // 3. Verify accounts page loaded
    await expect(page.locator('[data-testid="accounts-overview"]')).toBeVisible();
    
    // 4. Switch to Available tab
    await page.click('[data-testid="tab-available"]');
    await expect(page.locator('[data-testid="available-accounts-grid"]')).toBeVisible();

    // 5. Select multiple accounts
    await page.click('[data-testid="account-row-1"] [data-testid="checkbox"]');
    await page.click('[data-testid="account-row-2"] [data-testid="checkbox"]', { modifiers: ['Control'] });
    
    // 6. Perform bulk assignment
    await page.click('[data-testid="bulk-assign-button"]');
    await page.click('[data-testid="confirm-assignment"]');

    // 7. Verify assignment success
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('2 accounts assigned');

    // 8. Switch to Overview tab and verify accounts appear
    await page.click('[data-testid="tab-overview"]');
    await expect(page.locator('[data-testid="assigned-accounts-count"]')).toContainText('2');
  });

  test('account import workflow', async () => {
    await page.goto('/models/1/accounts');
    
    // 1. Switch to import section
    await page.click('[data-testid="import-accounts-button"]');
    
    // 2. Upload file
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles('./test-data/sample-accounts.txt');
    
    // 3. Preview import
    await expect(page.locator('[data-testid="import-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-count"]')).toContainText('5 accounts');
    
    // 4. Confirm import
    await page.click('[data-testid="confirm-import"]');
    
    // 5. Wait for import completion
    await expect(page.locator('[data-testid="import-complete"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="import-success"]')).toContainText('5 accounts imported');
    
    // 6. Verify accounts in warm-up tab
    await page.click('[data-testid="tab-warmup"]');
    await expect(page.locator('[data-testid="warmup-accounts-count"]')).toContainText('5');
  });

  test('warmup progress monitoring', async () => {
    await page.goto('/models/1/accounts');
    await page.click('[data-testid="tab-warmup"]');
    
    // 1. Verify warmup progress display
    await expect(page.locator('[data-testid="warmup-progress-1"]')).toBeVisible();
    
    // 2. Click on account to see detailed progress
    await page.click('[data-testid="account-row-1"]');
    await expect(page.locator('[data-testid="step-details-modal"]')).toBeVisible();
    
    // 3. Verify step progression
    await expect(page.locator('[data-testid="step-1-status"]')).toContainText('completed');
    await expect(page.locator('[data-testid="step-2-status"]')).toContainText('in progress');
    
    // 4. Check error handling for failed steps
    await page.click('[data-testid="failed-steps-filter"]');
    await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
  });
});
```

#### **Multi-Browser Testing**
```typescript
// Cross-browser compatibility tests
describe('Cross-Browser Compatibility', () => {
  const browsers = ['chromium', 'firefox', 'webkit'];
  
  browsers.forEach(browserName => {
    test(`DataGrid works correctly in ${browserName}`, async () => {
      const browser = await playwright[browserName].launch();
      const page = await browser.newPage();
      
      await page.goto('/models/1/accounts');
      
      // Test basic functionality
      await expect(page.locator('[data-testid="data-grid"]')).toBeVisible();
      
      // Test keyboard navigation
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('[data-testid="selected-row"]')).toBeVisible();
      
      // Test selection
      await page.click('[data-testid="account-row-1"]');
      await expect(page.locator('[data-testid="account-row-1"]')).toHaveClass(/selected/);
      
      await browser.close();
    });
  });
});
```

### **4. Performance Testing**

#### **Load Testing**
```typescript
// Performance and Load Tests
describe('Performance Tests', () => {
  test('DataGrid renders 10,000 accounts efficiently', async () => {
    const largeDataset = generateMockAccounts(10000);
    
    const startTime = performance.now();
    
    render(
      <DataGrid 
        data={largeDataset} 
        columns={mockColumns}
        virtualScrolling={true}
      />
    );
    
    // Wait for virtual scrolling to stabilize
    await waitFor(() => {
      expect(screen.getAllByRole('row')).toHaveLength(25); // Visible rows only
    });
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    expect(renderTime).toBeLessThan(200); // Should render in <200ms
    
    // Test scrolling performance
    const scrollContainer = screen.getByTestId('scroll-container');
    
    const scrollStart = performance.now();
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 50000 } });
    
    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(50000);
    });
    
    const scrollEnd = performance.now();
    expect(scrollEnd - scrollStart).toBeLessThan(50); // Smooth scrolling
  });

  test('API endpoints handle concurrent requests', async () => {
    const concurrentRequests = Array.from({ length: 100 }, () => 
      request(app).get('/api/models/1/accounts').set('Authorization', `Bearer ${validToken}`)
    );
    
    const startTime = performance.now();
    const responses = await Promise.all(concurrentRequests);
    const endTime = performance.now();
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
    
    // Total time should be reasonable
    expect(endTime - startTime).toBeLessThan(5000); // <5 seconds for 100 requests
  });

  test('memory usage remains stable during extended use', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Simulate extended usage
    for (let i = 0; i < 1000; i++) {
      render(<DataGrid data={generateMockAccounts(100)} columns={mockColumns} />);
      cleanup();
    }
    
    // Force garbage collection
    if (global.gc) global.gc();
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;
    
    // Memory growth should be minimal
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // <50MB growth
  });
});
```

#### **Database Performance Tests**
```typescript
describe('Database Performance', () => {
  test('account queries perform well with large datasets', async () => {
    // Seed large dataset
    await seedLargeDataset(50000); // 50k accounts
    
    const startTime = Date.now();
    
    const result = await db.query(`
      SELECT a.*, p.ip as proxy_ip 
      FROM accounts a 
      LEFT JOIN proxies p ON a.proxy_id = p.id 
      WHERE a.model_id = $1 
      AND a.lifecycle_state = $2
      ORDER BY a.created_at DESC 
      LIMIT 50 OFFSET 0
    `, [1, 'active']);
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    expect(queryTime).toBeLessThan(100); // <100ms query time
    expect(result.rows).toHaveLength(50);
  });

  test('warmup step queries are optimized', async () => {
    await seedWarmupStepLogs(10000); // 10k step logs
    
    const startTime = Date.now();
    
    const result = await db.query(`
      SELECT w.*, a.username 
      FROM warmup_step_logs w
      JOIN accounts a ON w.account_id = a.id
      WHERE w.status = 'failed'
      AND w.created_at >= $1
      ORDER BY w.created_at DESC
    `, [new Date(Date.now() - 24 * 60 * 60 * 1000)]); // Last 24 hours
    
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(50); // <50ms for complex query
  });
});
```

### **5. Bot API Testing**

#### **Bot Integration Tests**
```typescript
// Bot API Tests
describe('Bot API Integration', () => {
  beforeEach(async () => {
    await setupBotTestEnvironment();
  });

  test('bot can retrieve next task', async () => {
    // Setup account ready for warm-up
    const account = await createTestAccount({
      lifecycle_state: 'warming_up',
      warmup_step: 1,
      proxy_id: 1
    });

    const response = await request(app)
      .get('/api/bot/next-task/bot_001')
      .set('Authorization', `Bot bot_001:${botSecretKey}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.account_id).toBe(account.id);
    expect(response.body.data.step.step_number).toBe(1);
    expect(response.body.data.step.step_name).toBe('change_pfp');
    expect(response.body.data.proxy).toBeDefined();
    expect(response.body.data.account.username).toBe(account.username);
  });

  test('bot can report step completion', async () => {
    const account = await createTestAccount({ warmup_step: 1 });
    const taskId = `task_${Date.now()}`;

    const response = await request(app)
      .post('/api/bot/step-complete')
      .set('Authorization', `Bot bot_001:${botSecretKey}`)
      .send({
        task_id: taskId,
        account_id: account.id,
        step_number: 1,
        bot_id: 'bot_001',
        execution_time_ms: 12500,
        instagram_response: {
          success: true,
          profile_updated: true
        }
      })
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify step log was created
    const stepLog = await getWarmupStepLog(account.id, 1);
    expect(stepLog.status).toBe('completed');
    expect(stepLog.bot_id).toBe('bot_001');
    expect(stepLog.execution_time_ms).toBe(12500);

    // Verify account progressed to next step
    const updatedAccount = await getAccount(account.id);
    expect(updatedAccount.warmup_step).toBe(2);
  });

  test('bot can report step failure', async () => {
    const account = await createTestAccount({ warmup_step: 3 });
    
    const response = await request(app)
      .post('/api/bot/step-failed')
      .set('Authorization', `Bot bot_001:${botSecretKey}`)
      .send({
        task_id: 'task_123',
        account_id: account.id,
        step_number: 3,
        bot_id: 'bot_001',
        error_message: 'Instagram rate limit exceeded',
        error_details: {
          error_type: 'rate_limit',
          retry_after: 3600,
          instagram_error: 'Please wait before trying again'
        }
      })
      .expect(200);

    // Verify step marked as failed
    const stepLog = await getWarmupStepLog(account.id, 3);
    expect(stepLog.status).toBe('failed');
    expect(stepLog.error_message).toBe('Instagram rate limit exceeded');

    // Verify account marked for review if max retries exceeded
    const updatedAccount = await getAccount(account.id);
    if (stepLog.retry_count >= 3) {
      expect(updatedAccount.requires_human_review).toBe(true);
      expect(updatedAccount.lifecycle_state).toBe('human_review');
    }
  });

  test('bot heartbeat system works correctly', async () => {
    const response = await request(app)
      .put('/api/bot/heartbeat/bot_001')
      .set('Authorization', `Bot bot_001:${botSecretKey}`)
      .send({
        status: 'active',
        current_task: 'task_123',
        accounts_processed_today: 25,
        last_error: null,
        system_info: {
          cpu_usage: 45,
          memory_usage: 2.1,
          iphone_connected: true
        }
      })
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify bot status was recorded
    const botStatus = await getBotStatus('bot_001');
    expect(botStatus.status).toBe('active');
    expect(botStatus.accounts_processed_today).toBe(25);
    expect(botStatus.system_info.iphone_connected).toBe(true);
  });
});
```

### **6. Security Testing**

#### **Authentication & Authorization Tests**
```typescript
describe('Security Tests', () => {
  test('prevents unauthorized access to bot APIs', async () => {
    await request(app)
      .get('/api/bot/next-task/bot_001')
      .expect(401);

    await request(app)
      .get('/api/bot/next-task/bot_001')
      .set('Authorization', 'Bearer invalid_token')
      .expect(401);
  });

  test('prevents cross-bot access', async () => {
    await request(app)
      .get('/api/bot/next-task/bot_002')
      .set('Authorization', `Bot bot_001:${botSecretKey}`)
      .expect(403);
  });

  test('validates input data properly', async () => {
    const response = await request(app)
      .post('/api/bot/step-complete')
      .set('Authorization', `Bot bot_001:${botSecretKey}`)
      .send({
        // Missing required fields
        account_id: 'invalid',
        step_number: 99
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rate limiting works correctly', async () => {
    const requests = Array.from({ length: 100 }, () => 
      request(app)
        .get('/api/bot/heartbeat/bot_001')
        .set('Authorization', `Bot bot_001:${botSecretKey}`)
    );

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

## **Test Data Management**

### **Test Database Setup**
```typescript
const setupTestDatabase = async () => {
  // Create test database
  await db.query('CREATE DATABASE test_instagram_platform');
  
  // Run migrations
  await runMigrations('test');
  
  // Seed minimal required data
  await seedTestData();
};

const seedTestData = async () => {
  // Create test models
  await db.query(`
    INSERT INTO models (id, name, status) VALUES 
    (1, 'Test Model 1', 'active'),
    (2, 'Test Model 2', 'active')
  `);

  // Create test proxies
  await db.query(`
    INSERT INTO proxies (id, ip, port, username, password_encrypted, provider, location, monthly_cost) VALUES
    (1, '192.168.1.100', 8080, 'proxy1', 'encrypted_pass', 'Provider1', 'New York', 29.99),
    (2, '192.168.1.101', 8080, 'proxy2', 'encrypted_pass', 'Provider1', 'Los Angeles', 29.99)
  `);

  // Create test accounts
  const testAccounts = Array.from({ length: 10 }, (_, i) => ({
    username: `test_user_${i}`,
    email: `test${i}@example.com`,
    password_encrypted: 'encrypted_password',
    model_id: 1,
    lifecycle_state: 'ready'
  }));

  for (const account of testAccounts) {
    await db.query(`
      INSERT INTO accounts (username, email, password_encrypted, model_id, lifecycle_state)
      VALUES ($1, $2, $3, $4, $5)
    `, [account.username, account.email, account.password_encrypted, account.model_id, account.lifecycle_state]);
  }
};
```

### **Test Data Cleanup**
```typescript
const cleanupTestDatabase = async () => {
  // Clean up in reverse dependency order
  await db.query('DELETE FROM warmup_step_logs');
  await db.query('DELETE FROM account_state_history');
  await db.query('DELETE FROM accounts');
  await db.query('DELETE FROM proxies');
  await db.query('DELETE FROM model_content');
  await db.query('DELETE FROM text_pools');
  await db.query('DELETE FROM models');
};
```

## **Continuous Integration**

### **GitHub Actions Workflow**
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## **Test Metrics & Reporting**

### **Coverage Targets**
- **Overall Coverage**: Minimum 80%
- **Critical Paths**: Minimum 95% (account lifecycle, bot APIs)
- **Component Library**: Minimum 90%
- **Utility Functions**: Minimum 85%

### **Performance Benchmarks**
- **Unit Test Suite**: <2 minutes
- **Integration Test Suite**: <5 minutes  
- **E2E Test Suite**: <10 minutes
- **Full Test Suite**: <15 minutes

### **Quality Gates**
- All tests must pass
- Coverage thresholds must be met
- No critical security vulnerabilities
- Performance benchmarks must be maintained
- Accessibility tests must pass 