package com.vcsm.config;

import com.bucket4j.Bucket4j;
import com.bucket4j.local.LocalBucket;
import com.bucket4j.local.LocalBucketBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.cache.Cache;
import javax.cache.CacheManager;
import javax.cache.Caching;
import javax.cache.configuration.MutableConfiguration;
import java.time.Duration;

@Configuration
public class RateLimitConfig {

    @Bean
    public Cache<String, LocalBucket> bucketCache() {
        CacheManager cacheManager = Caching.getCachingProvider().getCacheManager();
        MutableConfiguration<String, LocalBucket> config = new MutableConfiguration<>();
        config.setStoreByValue(false);
        
        Cache<String, LocalBucket> cache = cacheManager.createCache("buckets", config);
        return cache;
    }

    public LocalBucket createBucket(int capacity, Duration refillDuration, int refillTokens) {
        LocalBucketBuilder builder = Bucket4j.builder()
            .addLimit(limit -> limit
                .capacity(capacity)
                .refillIntervally(refillTokens, refillDuration)
            );
        return builder.build();
    }

    public LocalBucket createDefaultBucket() {
        // 10 requests per minute
        return createBucket(10, Duration.ofMinutes(1), 10);
    }
}