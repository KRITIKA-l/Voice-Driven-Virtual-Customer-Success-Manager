package com.vcsm.service;

import com.bucket4j.local.LocalBucket;
import com.vcsm.config.RateLimitConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.cache.Cache;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {

    private static final int DEFAULT_LIMIT = 10;
    private static final Duration DEFAULT_DURATION = Duration.ofMinutes(1);

    @Autowired
    private RateLimitConfig rateLimitConfig;

    @Autowired
    private Cache<String, LocalBucket> bucketCache;

    private final ConcurrentHashMap<String, LocalBucket> localBuckets = new ConcurrentHashMap<>();

    /**
     * Check if user can make a request
     */
    public boolean tryConsume(String userId) {
        LocalBucket bucket = getBucket(userId);
        return bucket.tryConsume(1);
    }

    /**
     * Get remaining tokens for user
     */
    public long getRemainingTokens(String userId) {
        LocalBucket bucket = getBucket(userId);
        return bucket.getAvailableTokens();
    }

    /**
     * Reset rate limit for user
     */
    public void resetLimit(String userId) {
        localBuckets.remove(userId);
        bucketCache.remove(userId);
    }

    /**
     * Get or create bucket for user
     */
    private LocalBucket getBucket(String userId) {
        // Try cache first
        LocalBucket cachedBucket = bucketCache.get(userId);
        if (cachedBucket != null) {
            return cachedBucket;
        }

        // Try local map
        LocalBucket localBucket = localBuckets.get(userId);
        if (localBucket == null) {
            localBucket = rateLimitConfig.createDefaultBucket();
            localBuckets.put(userId, localBucket);
        }

        // Cache it
        bucketCache.put(userId, localBucket);
        return localBucket;
    }

    /**
     * Get rate limit status for user
     */
    public RateLimitStatus getStatus(String userId) {
        long remaining = getRemainingTokens(userId);
        boolean canConsume = tryConsume(userId);
        return new RateLimitStatus(remaining, canConsume, DEFAULT_LIMIT);
    }

    public static class RateLimitStatus {
        private final long remaining;
        private final boolean canConsume;
        private final int limit;

        public RateLimitStatus(long remaining, boolean canConsume, int limit) {
            this.remaining = remaining;
            this.canConsume = canConsume;
            this.limit = limit;
        }

        public long getRemaining() { return remaining; }
        public boolean isCanConsume() { return canConsume; }
        public int getLimit() { return limit; }
    }
}