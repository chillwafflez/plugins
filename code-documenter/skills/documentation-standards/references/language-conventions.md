# Language-Specific Documentation Conventions

Detailed docstring and comment conventions for major programming languages. Use this reference when generating inline documentation to match language-specific idioms.

## Python

### Google-Style Docstrings (Recommended)

```python
def fetch_user(user_id: int, include_posts: bool = False) -> User:
    """Fetch a user by ID from the database.

    Retrieves the user record and optionally eager-loads
    their associated posts.

    Args:
        user_id: The unique identifier of the user.
        include_posts: Whether to include the user's posts
            in the response. Defaults to False.

    Returns:
        A User object with populated fields.

    Raises:
        UserNotFoundError: If no user exists with the given ID.
        DatabaseConnectionError: If the database is unreachable.
    """
```

### NumPy-Style Docstrings

```python
def calculate_stats(data, weights=None):
    """
    Calculate weighted statistics for a dataset.

    Parameters
    ----------
    data : array_like
        Input data array.
    weights : array_like, optional
        Weights for each data point. If None, uniform weights are used.

    Returns
    -------
    dict
        Dictionary containing 'mean', 'std', and 'median' keys.

    Examples
    --------
    >>> calculate_stats([1, 2, 3])
    {'mean': 2.0, 'std': 0.816, 'median': 2.0}
    """
```

### Sphinx-Style Docstrings

```python
def connect(host, port=5432):
    """Connect to the database server.

    :param host: The database server hostname.
    :type host: str
    :param port: The port number, defaults to 5432.
    :type port: int
    :returns: A database connection object.
    :rtype: Connection
    :raises ConnectionError: If the server is unreachable.
    """
```

### Class Docstrings

```python
class TaskQueue:
    """A priority-based task queue with retry support.

    Manages task scheduling, execution ordering, and automatic
    retry with exponential backoff for failed tasks.

    Attributes:
        max_retries: Maximum number of retry attempts per task.
        backoff_factor: Multiplier for exponential backoff delay.

    Example:
        queue = TaskQueue(max_retries=3)
        queue.enqueue(my_task, priority=1)
        queue.process()
    """
```

## JavaScript / TypeScript

### JSDoc

```javascript
/**
 * Fetch a user by ID from the API.
 *
 * @param {number} userId - The unique identifier of the user.
 * @param {Object} [options] - Optional configuration.
 * @param {boolean} [options.includePosts=false] - Whether to include posts.
 * @param {number} [options.timeout=5000] - Request timeout in milliseconds.
 * @returns {Promise<User>} The user object.
 * @throws {NotFoundError} If the user does not exist.
 *
 * @example
 * const user = await fetchUser(123, { includePosts: true });
 */
async function fetchUser(userId, options = {}) {
```

### TypeScript with JSDoc

```typescript
/**
 * Configuration options for the cache layer.
 */
interface CacheOptions {
  /** Time-to-live in seconds. Defaults to 3600. */
  ttl?: number;
  /** Maximum number of entries. Defaults to 1000. */
  maxSize?: number;
  /** Eviction strategy when cache is full. */
  evictionPolicy?: 'lru' | 'lfu' | 'fifo';
}

/**
 * Create a new cache instance with the given options.
 *
 * @param options - Cache configuration options.
 * @returns A configured cache instance.
 */
function createCache<T>(options: CacheOptions): Cache<T> {
```

### React Component Documentation

```tsx
/**
 * A button component with loading state and variant support.
 *
 * @param props - Component props.
 * @param props.variant - Visual style variant.
 * @param props.isLoading - Whether to show loading spinner.
 * @param props.onClick - Click event handler.
 * @param props.children - Button content.
 *
 * @example
 * <Button variant="primary" onClick={handleSubmit}>
 *   Submit
 * </Button>
 */
```

## Java

### Javadoc

```java
/**
 * Processes a batch of orders and returns fulfillment results.
 *
 * <p>Orders are validated, grouped by warehouse, and dispatched
 * in parallel. Failed orders are retried up to {@code maxRetries} times.
 *
 * @param orders    the list of orders to process; must not be null or empty
 * @param maxRetries maximum retry attempts for failed orders
 * @return a list of {@link FulfillmentResult} for each order
 * @throws IllegalArgumentException if orders is null or empty
 * @throws WarehouseException if a warehouse is unreachable after retries
 * @see FulfillmentResult
 * @since 2.1.0
 */
public List<FulfillmentResult> processBatch(
        List<Order> orders, int maxRetries) {
```

### Class-Level Javadoc

```java
/**
 * Thread-safe connection pool for database connections.
 *
 * <p>Manages a pool of reusable database connections with automatic
 * health checking and connection recycling. Supports both synchronous
 * and asynchronous connection acquisition.
 *
 * <p>Usage example:
 * <pre>{@code
 * ConnectionPool pool = new ConnectionPool.Builder()
 *     .maxSize(20)
 *     .idleTimeout(Duration.ofMinutes(5))
 *     .build();
 *
 * try (Connection conn = pool.acquire()) {
 *     // use connection
 * }
 * }</pre>
 *
 * @author Engineering Team
 * @version 3.0
 * @since 1.0
 */
```

## C#

### XML Documentation Comments

```csharp
/// <summary>
/// Validates and processes a payment transaction.
/// </summary>
/// <remarks>
/// This method performs fraud detection, balance verification,
/// and ledger posting as an atomic operation.
/// </remarks>
/// <param name="transaction">The transaction to process.</param>
/// <param name="options">Optional processing configuration.</param>
/// <returns>
/// A <see cref="PaymentResult"/> indicating success or failure
/// with detailed error information.
/// </returns>
/// <exception cref="InsufficientFundsException">
/// Thrown when the account balance is insufficient.
/// </exception>
/// <example>
/// <code>
/// var result = await processor.ProcessPayment(transaction);
/// if (result.IsSuccess)
///     Console.WriteLine($"Processed: {result.TransactionId}");
/// </code>
/// </example>
public async Task<PaymentResult> ProcessPayment(
    Transaction transaction,
    ProcessingOptions? options = null)
{
```

## Go

### GoDoc

```go
// UserService provides methods for managing user accounts.
// It handles creation, authentication, and profile updates.
//
// UserService is safe for concurrent use.
type UserService struct {
    db    *sql.DB
    cache *redis.Client
}

// FindByEmail retrieves a user by their email address.
// It checks the cache first and falls back to the database.
//
// FindByEmail returns ErrNotFound if no user exists with the
// given email address. It returns ErrDatabase if the database
// query fails.
func (s *UserService) FindByEmail(ctx context.Context, email string) (*User, error) {
```

## Rust

### RustDoc

```rust
/// A thread-safe, bounded channel for message passing.
///
/// `Channel` supports multiple producers and a single consumer.
/// Messages are delivered in FIFO order with backpressure when
/// the buffer is full.
///
/// # Examples
///
/// ```
/// let (tx, rx) = Channel::new(100);
///
/// tx.send(Message::new("hello")).await?;
/// let msg = rx.recv().await?;
/// assert_eq!(msg.body(), "hello");
/// ```
///
/// # Errors
///
/// Returns [`ChannelError::Closed`] if the receiver has been dropped.
/// Returns [`ChannelError::Full`] if the buffer is at capacity and
/// a timeout is specified.
pub struct Channel<T> {
```

## Ruby

### YARD

```ruby
# Processes a batch of items with the given strategy.
#
# Applies the processing strategy to each item in parallel,
# collecting results and handling failures gracefully.
#
# @param items [Array<Item>] the items to process
# @param strategy [Symbol] the processing strategy (:fast, :thorough, :balanced)
# @param concurrency [Integer] maximum parallel workers (default: 4)
# @return [BatchResult] aggregated results with success/failure counts
# @raise [InvalidStrategyError] if strategy is not recognized
#
# @example Process with default settings
#   result = processor.process_batch(items, :balanced)
#   puts "#{result.success_count} succeeded"
#
# @see BatchResult
# @since 2.0.0
def process_batch(items, strategy, concurrency: 4)
```

## PHP

### PHPDoc

```php
/**
 * Send a notification through the configured channels.
 *
 * Dispatches the notification to all registered channels
 * (email, SMS, push) based on user preferences. Failed
 * deliveries are queued for retry.
 *
 * @param Notification $notification The notification to send.
 * @param User         $recipient    The target user.
 * @param array{
 *     channels?: string[],
 *     priority?: 'low'|'normal'|'high',
 *     retry?: bool
 * } $options Optional delivery configuration.
 *
 * @return DeliveryReport Results for each attempted channel.
 *
 * @throws InvalidRecipientException If user has no contact info.
 * @throws RateLimitException If sending rate is exceeded.
 */
public function send(
    Notification $notification,
    User $recipient,
    array $options = []
): DeliveryReport {
```

## General Principles Across Languages

1. **First line is a summary** — One sentence, imperative mood ("Fetch", "Calculate", "Process")
2. **Document parameters** — Type, name, description, defaults, constraints
3. **Document return values** — Type, description, possible values
4. **Document exceptions/errors** — When they're thrown and why
5. **Include examples** — For non-trivial functions, show usage
6. **Link related items** — Cross-reference related functions/classes
7. **Version annotations** — Mark when features were added/deprecated
