#!/bin/bash

# Performance Testing Script for PEGASUS Summarization Integration
# Tests various aspects of performance including response times, caching, and resource usage

set -e

echo "🚀 Starting PEGASUS Summarization Performance Tests"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_section() {
    echo -e "${BLUE}[SECTION]${NC} $1"
}

# Configuration
SUMMARIZATION_SERVICE_URL="http://localhost:8001"
BACKEND_SERVICE_URL="http://localhost:3001"
FRONTEND_SERVICE_URL="http://localhost:3000"
RESULTS_DIR="performance-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    
    if curl -f -s "$url/health" > /dev/null 2>&1; then
        print_status "$name service is running"
        return 0
    else
        print_error "$name service is not running at $url"
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local timeout=${3:-60}
    
    print_status "Waiting for $name service to be ready..."
    
    local counter=0
    while [ $counter -lt $timeout ]; do
        if curl -f -s "$url/health" > /dev/null 2>&1; then
            print_status "$name service is ready!"
            return 0
        fi
        
        sleep 2
        counter=$((counter + 2))
        
        if [ $((counter % 10)) -eq 0 ]; then
            print_status "Still waiting for $name service... (${counter}s elapsed)"
        fi
    done
    
    print_error "$name service failed to become ready within ${timeout}s"
    return 1
}

# Check prerequisites
print_section "Checking Prerequisites"

# Check if Python is available for performance monitoring
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required for performance monitoring"
    exit 1
fi

# Check if required Python packages are available
python3 -c "import aiohttp, psutil, matplotlib" 2>/dev/null || {
    print_warning "Installing required Python packages..."
    pip3 install aiohttp psutil matplotlib pandas || {
        print_error "Failed to install required packages"
        exit 1
    }
}

# Check if services are running
print_section "Checking Service Availability"

if ! check_service "$SUMMARIZATION_SERVICE_URL" "Summarization"; then
    print_warning "Starting summarization service..."
    cd summarization-service
    python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001 &
    SUMMARIZATION_PID=$!
    cd ..
    
    if ! wait_for_service "$SUMMARIZATION_SERVICE_URL" "Summarization" 120; then
        print_error "Failed to start summarization service"
        kill $SUMMARIZATION_PID 2>/dev/null || true
        exit 1
    fi
fi

if ! check_service "$BACKEND_SERVICE_URL" "Backend"; then
    print_warning "Backend service not running - some tests may be limited"
fi

if ! check_service "$FRONTEND_SERVICE_URL" "Frontend"; then
    print_warning "Frontend service not running - E2E tests will be skipped"
fi

# Run performance tests
print_section "Running Performance Tests"

# 1. Basic Performance Tests
print_status "Running basic performance tests..."
python3 scripts/performance-monitor.py --mode test > "$RESULTS_DIR/basic_performance_${TIMESTAMP}.log" 2>&1 || {
    print_error "Basic performance tests failed"
    cat "$RESULTS_DIR/basic_performance_${TIMESTAMP}.log"
}

# 2. Summarization Service Unit Tests with Performance Focus
print_status "Running summarization service performance tests..."
cd summarization-service
python3 -m pytest test_performance.py -v -s > "../$RESULTS_DIR/service_performance_${TIMESTAMP}.log" 2>&1 || {
    print_warning "Some service performance tests failed"
}
cd ..

# 3. Load Testing with different text sizes
print_section "Load Testing with Various Text Sizes"

# Create test data
cat > "$RESULTS_DIR/test_texts.json" << 'EOF'
{
  "short": "This is a short text for testing basic summarization performance.",
  "medium": "This is a medium-length text that should test the summarization service's ability to handle typical user input. It contains multiple sentences and should provide a good baseline for performance testing. The text is long enough to be meaningful but short enough to process quickly.",
  "long": "This is a long text that will test the chunking capabilities of the summarization service. It contains multiple paragraphs and should require the service to split the text into chunks, process each chunk separately, and then consolidate the results into a final summary. This type of content is representative of longer documents that users might want to summarize, such as research papers, articles, or detailed notes. The service should handle this efficiently while maintaining the quality of the summary.",
  "extra_long": "This is an extremely long text designed to stress test the summarization service. It will definitely require chunking and should test the service's ability to handle large inputs gracefully. The text contains multiple topics and themes that should be consolidated into a coherent summary. This represents the upper bounds of what users might reasonably expect to summarize, such as entire chapters, long reports, or comprehensive documentation. The service should process this without running out of memory or timing out, and should produce a meaningful summary that captures the key points from across the entire document."
}
EOF

# Test each text size
for size in short medium long extra_long; do
    print_status "Testing $size text performance..."
    
    # Extract text for this size
    text=$(python3 -c "import json; data=json.load(open('$RESULTS_DIR/test_texts.json')); print(data['$size'])")
    
    # Measure performance
    start_time=$(date +%s.%N)
    
    response=$(curl -s -w "%{http_code}" -X POST "$SUMMARIZATION_SERVICE_URL/summarize" \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"$text\"}" \
        --max-time 120)
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc)
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        summary_length=$(echo "$response_body" | python3 -c "import json,sys; data=json.load(sys.stdin); print(len(data.get('summary','')))")
        processing_time=$(echo "$response_body" | python3 -c "import json,sys; data=json.load(sys.stdin); print(data.get('processing_time',0))")
        chunks=$(echo "$response_body" | python3 -c "import json,sys; data=json.load(sys.stdin); print(data.get('chunks_processed',1))")
        
        print_status "$size text: ${duration}s total, ${processing_time}s processing, $chunks chunks, $summary_length chars summary"
        
        # Log detailed results
        echo "$(date): $size,$duration,$processing_time,$chunks,$summary_length,success" >> "$RESULTS_DIR/load_test_${TIMESTAMP}.csv"
    else
        print_error "$size text failed with HTTP $http_code"
        echo "$(date): $size,$duration,0,0,0,error_$http_code" >> "$RESULTS_DIR/load_test_${TIMESTAMP}.csv"
    fi
    
    # Small delay between tests
    sleep 2
done

# 4. Concurrent Request Testing
print_section "Concurrent Request Testing"

print_status "Testing concurrent request handling..."

# Create a medium text for concurrent testing
medium_text="This is a test text for concurrent request testing. It should be processed efficiently even when multiple requests are made simultaneously."

# Test with 3, 5, and 10 concurrent requests
for concurrency in 3 5 10; do
    print_status "Testing with $concurrency concurrent requests..."
    
    # Create temporary script for concurrent testing
    cat > "$RESULTS_DIR/concurrent_test.sh" << EOF
#!/bin/bash
for i in \$(seq 1 $concurrency); do
    (
        start=\$(date +%s.%N)
        response=\$(curl -s -w "%{http_code}" -X POST "$SUMMARIZATION_SERVICE_URL/summarize" \\
            -H "Content-Type: application/json" \\
            -d '{"text":"$medium_text"}' \\
            --max-time 60)
        end=\$(date +%s.%N)
        duration=\$(echo "\$end - \$start" | bc)
        http_code="\${response: -3}"
        echo "Request \$i: \$duration seconds, HTTP \$http_code"
    ) &
done
wait
EOF
    
    chmod +x "$RESULTS_DIR/concurrent_test.sh"
    
    start_time=$(date +%s.%N)
    bash "$RESULTS_DIR/concurrent_test.sh" > "$RESULTS_DIR/concurrent_${concurrency}_${TIMESTAMP}.log" 2>&1
    end_time=$(date +%s.%N)
    total_time=$(echo "$end_time - $start_time" | bc)
    
    successful_requests=$(grep "HTTP 200" "$RESULTS_DIR/concurrent_${concurrency}_${TIMESTAMP}.log" | wc -l)
    
    print_status "Concurrency $concurrency: $successful_requests/$concurrency successful in ${total_time}s"
    
    # Clean up
    rm -f "$RESULTS_DIR/concurrent_test.sh"
done

# 5. Cache Performance Testing
print_section "Cache Performance Testing"

print_status "Testing cache effectiveness..."

test_text="This is a test text for cache performance testing. It should be cached after the first request."

# First request (cache miss)
print_status "Making first request (cache miss)..."
start_time=$(date +%s.%N)
response1=$(curl -s -X POST "$SUMMARIZATION_SERVICE_URL/summarize" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"$test_text\"}")
end_time=$(date +%s.%N)
first_duration=$(echo "$end_time - $start_time" | bc)

# Second request (cache hit)
print_status "Making second request (cache hit)..."
start_time=$(date +%s.%N)
response2=$(curl -s -X POST "$SUMMARIZATION_SERVICE_URL/summarize" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"$test_text\"}")
end_time=$(date +%s.%N)
second_duration=$(echo "$end_time - $start_time" | bc)

# Calculate speedup
speedup=$(echo "scale=2; $first_duration / $second_duration" | bc)

print_status "Cache test results:"
print_status "  First request: ${first_duration}s"
print_status "  Second request: ${second_duration}s"
print_status "  Speedup: ${speedup}x"

# Check if responses are identical
if [ "$response1" = "$response2" ]; then
    print_status "  Cache consistency: ✅ Identical responses"
else
    print_warning "  Cache consistency: ⚠️  Different responses"
fi

# 6. Memory Usage Monitoring
print_section "Memory Usage Monitoring"

print_status "Monitoring memory usage during processing..."

# Start continuous monitoring in background
python3 scripts/performance-monitor.py --mode monitor --duration 2 --interval 5 > "$RESULTS_DIR/memory_monitoring_${TIMESTAMP}.log" 2>&1 &
MONITOR_PID=$!

# Generate some load while monitoring
for i in {1..5}; do
    curl -s -X POST "$SUMMARIZATION_SERVICE_URL/summarize" \
        -H "Content-Type: application/json" \
        -d '{"text":"This is test text number '$i' for memory monitoring. It should help us understand how memory usage changes during processing."}' \
        > /dev/null &
    
    sleep 3
done

# Wait for monitoring to complete
wait $MONITOR_PID

# 7. Frontend E2E Performance (if available)
if check_service "$FRONTEND_SERVICE_URL" "Frontend" > /dev/null 2>&1; then
    print_section "Frontend E2E Performance Testing"
    
    print_status "Running frontend performance tests..."
    cd frontend
    npm run test:e2e -- --grep "performance" > "../$RESULTS_DIR/e2e_performance_${TIMESTAMP}.log" 2>&1 || {
        print_warning "Some E2E performance tests failed"
    }
    cd ..
else
    print_warning "Skipping E2E performance tests - frontend not available"
fi

# 8. Generate Performance Report
print_section "Generating Performance Report"

print_status "Compiling performance report..."

cat > "$RESULTS_DIR/performance_summary_${TIMESTAMP}.md" << EOF
# PEGASUS Summarization Performance Test Report

**Generated:** $(date)
**Test Duration:** Approximately 10-15 minutes

## Test Environment
- Summarization Service: $SUMMARIZATION_SERVICE_URL
- Backend Service: $BACKEND_SERVICE_URL  
- Frontend Service: $FRONTEND_SERVICE_URL

## Test Results Summary

### Load Testing Results
$([ -f "$RESULTS_DIR/load_test_${TIMESTAMP}.csv" ] && echo "See load_test_${TIMESTAMP}.csv for detailed results" || echo "Load test results not available")

### Concurrent Request Testing
- Tested with 3, 5, and 10 concurrent requests
- Results logged in concurrent_*_${TIMESTAMP}.log files

### Cache Performance
- First request: ${first_duration}s
- Second request: ${second_duration}s  
- Speedup: ${speedup}x
- Cache consistency: $([ "$response1" = "$response2" ] && echo "✅ Passed" || echo "⚠️ Failed")

### Memory Monitoring
- Continuous monitoring results in memory_monitoring_${TIMESTAMP}.log
- Performance plots generated in monitoring_plots/ directory

## Files Generated
- Basic performance: basic_performance_${TIMESTAMP}.log
- Service performance: service_performance_${TIMESTAMP}.log
- Load testing: load_test_${TIMESTAMP}.csv
- Concurrent testing: concurrent_*_${TIMESTAMP}.log
- Memory monitoring: memory_monitoring_${TIMESTAMP}.log
- E2E performance: e2e_performance_${TIMESTAMP}.log

## Recommendations

1. **Response Times**: Target < 15s for medium texts, < 30s for long texts
2. **Concurrency**: Service should handle at least 5 concurrent requests efficiently
3. **Caching**: Should provide 2x+ speedup for identical requests
4. **Memory**: Monitor for memory leaks during extended usage

## Next Steps

1. Review detailed logs for any performance bottlenecks
2. Optimize chunking parameters if needed
3. Adjust cache settings based on usage patterns
4. Consider scaling strategies for production deployment
EOF

print_status "Performance report generated: $RESULTS_DIR/performance_summary_${TIMESTAMP}.md"

# Cleanup
if [ -n "$SUMMARIZATION_PID" ]; then
    print_status "Stopping summarization service..."
    kill $SUMMARIZATION_PID 2>/dev/null || true
fi

print_section "Performance Testing Complete"
print_status "✅ All performance tests completed!"
print_status "📊 Results available in: $RESULTS_DIR/"
print_status "📋 Summary report: $RESULTS_DIR/performance_summary_${TIMESTAMP}.md"

echo ""
echo "Key Performance Metrics:"
echo "- Cache speedup: ${speedup}x"
echo "- Test files generated: $(ls -1 "$RESULTS_DIR"/*"$TIMESTAMP"* | wc -l)"
echo ""
echo "Review the detailed logs and reports for comprehensive performance analysis."