#!/usr/bin/env python3
"""
Performance monitoring script for PEGASUS summarization service
Monitors system resources, response times, and service health
"""

import asyncio
import aiohttp
import psutil
import time
import json
import argparse
from typing import Dict, List, Any
from datetime import datetime
import matplotlib.pyplot as plt
import pandas as pd

class PerformanceMonitor:
    """Monitor performance metrics for the summarization service"""
    
    def __init__(self, service_url: str = "http://localhost:8001"):
        self.service_url = service_url
        self.metrics_history: List[Dict[str, Any]] = []
        
    async def check_service_health(self) -> Dict[str, Any]:
        """Check service health and get detailed status"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.service_url}/system/health-detailed") as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        return {"status": "unhealthy", "error": f"HTTP {response.status}"}
        except Exception as e:
            return {"status": "unreachable", "error": str(e)}
    
    async def get_system_resources(self) -> Dict[str, Any]:
        """Get system resource usage"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.service_url}/system/resources") as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("resources", {})
                    else:
                        return {}
        except Exception:
            # Fallback to local monitoring
            return {
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_percent": psutil.virtual_memory().percent,
                "available_memory_gb": psutil.virtual_memory().available / (1024**3),
                "gpu_available": False
            }
    
    async def test_summarization_performance(self, test_texts: List[str]) -> List[Dict[str, Any]]:
        """Test summarization performance with various text sizes"""
        results = []
        
        async with aiohttp.ClientSession() as session:
            for i, text in enumerate(test_texts):
                try:
                    start_time = time.time()
                    
                    async with session.post(
                        f"{self.service_url}/summarize",
                        json={"text": text},
                        timeout=aiohttp.ClientTimeout(total=60)
                    ) as response:
                        end_time = time.time()
                        
                        if response.status == 200:
                            data = await response.json()
                            results.append({
                                "test_id": i,
                                "text_length": len(text),
                                "response_time": end_time - start_time,
                                "summary_length": len(data.get("summary", "")),
                                "chunks_processed": data.get("chunks_processed", 1),
                                "processing_time": data.get("processing_time", 0),
                                "status": "success"
                            })
                        else:
                            results.append({
                                "test_id": i,
                                "text_length": len(text),
                                "response_time": end_time - start_time,
                                "status": "error",
                                "error_code": response.status
                            })
                
                except asyncio.TimeoutError:
                    results.append({
                        "test_id": i,
                        "text_length": len(text),
                        "status": "timeout"
                    })
                
                except Exception as e:
                    results.append({
                        "test_id": i,
                        "text_length": len(text),
                        "status": "error",
                        "error": str(e)
                    })
                
                # Small delay between requests
                await asyncio.sleep(1)
        
        return results
    
    async def test_concurrent_performance(self, text: str, concurrent_requests: int = 5) -> Dict[str, Any]:
        """Test performance under concurrent load"""
        
        async def make_request(session, request_id):
            try:
                start_time = time.time()
                async with session.post(
                    f"{self.service_url}/summarize",
                    json={"text": text},
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    end_time = time.time()
                    
                    return {
                        "request_id": request_id,
                        "response_time": end_time - start_time,
                        "status": "success" if response.status == 200 else "error",
                        "status_code": response.status
                    }
            except Exception as e:
                return {
                    "request_id": request_id,
                    "status": "error",
                    "error": str(e)
                }
        
        async with aiohttp.ClientSession() as session:
            start_time = time.time()
            
            tasks = [make_request(session, i) for i in range(concurrent_requests)]
            results = await asyncio.gather(*tasks)
            
            total_time = time.time() - start_time
            
            successful_requests = [r for r in results if r["status"] == "success"]
            
            return {
                "total_requests": concurrent_requests,
                "successful_requests": len(successful_requests),
                "total_time": total_time,
                "average_response_time": sum(r.get("response_time", 0) for r in successful_requests) / len(successful_requests) if successful_requests else 0,
                "requests_per_second": len(successful_requests) / total_time if total_time > 0 else 0,
                "results": results
            }
    
    async def test_caching_performance(self, text: str) -> Dict[str, Any]:
        """Test caching effectiveness"""
        
        async with aiohttp.ClientSession() as session:
            # First request (cache miss)
            start_time = time.time()
            async with session.post(f"{self.service_url}/summarize", json={"text": text}) as response:
                first_time = time.time() - start_time
                first_success = response.status == 200
            
            # Small delay
            await asyncio.sleep(0.5)
            
            # Second request (cache hit)
            start_time = time.time()
            async with session.post(f"{self.service_url}/summarize", json={"text": text}) as response:
                second_time = time.time() - start_time
                second_success = response.status == 200
            
            return {
                "first_request_time": first_time,
                "second_request_time": second_time,
                "speedup": first_time / second_time if second_time > 0 else 0,
                "cache_effective": second_time < first_time * 0.5,
                "both_successful": first_success and second_success
            }
    
    async def collect_metrics(self) -> Dict[str, Any]:
        """Collect comprehensive performance metrics"""
        timestamp = datetime.now()
        
        # Get service health
        health = await self.check_service_health()
        
        # Get system resources
        resources = await self.get_system_resources()
        
        # Get cache stats
        cache_stats = {}
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.service_url}/cache/stats") as response:
                    if response.status == 200:
                        data = await response.json()
                        cache_stats = data.get("cache_stats", {})
        except Exception:
            pass
        
        metrics = {
            "timestamp": timestamp.isoformat(),
            "health": health,
            "resources": resources,
            "cache_stats": cache_stats
        }
        
        self.metrics_history.append(metrics)
        return metrics
    
    def generate_performance_report(self, output_file: str = "performance_report.json"):
        """Generate a comprehensive performance report"""
        
        if not self.metrics_history:
            print("No metrics collected yet")
            return
        
        # Calculate averages and trends
        cpu_usage = [m["resources"].get("cpu_percent", 0) for m in self.metrics_history]
        memory_usage = [m["resources"].get("memory_percent", 0) for m in self.metrics_history]
        
        report = {
            "report_generated": datetime.now().isoformat(),
            "metrics_count": len(self.metrics_history),
            "summary": {
                "avg_cpu_usage": sum(cpu_usage) / len(cpu_usage) if cpu_usage else 0,
                "max_cpu_usage": max(cpu_usage) if cpu_usage else 0,
                "avg_memory_usage": sum(memory_usage) / len(memory_usage) if memory_usage else 0,
                "max_memory_usage": max(memory_usage) if memory_usage else 0,
            },
            "detailed_metrics": self.metrics_history
        }
        
        # Save report
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"Performance report saved to {output_file}")
        return report
    
    def plot_metrics(self, output_dir: str = "performance_plots"):
        """Generate performance visualization plots"""
        
        if not self.metrics_history:
            print("No metrics to plot")
            return
        
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        # Extract data for plotting
        timestamps = [datetime.fromisoformat(m["timestamp"]) for m in self.metrics_history]
        cpu_usage = [m["resources"].get("cpu_percent", 0) for m in self.metrics_history]
        memory_usage = [m["resources"].get("memory_percent", 0) for m in self.metrics_history]
        
        # CPU Usage Plot
        plt.figure(figsize=(12, 6))
        plt.plot(timestamps, cpu_usage, label='CPU Usage %', color='blue')
        plt.title('CPU Usage Over Time')
        plt.xlabel('Time')
        plt.ylabel('CPU Usage (%)')
        plt.legend()
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(f"{output_dir}/cpu_usage.png")
        plt.close()
        
        # Memory Usage Plot
        plt.figure(figsize=(12, 6))
        plt.plot(timestamps, memory_usage, label='Memory Usage %', color='red')
        plt.title('Memory Usage Over Time')
        plt.xlabel('Time')
        plt.ylabel('Memory Usage (%)')
        plt.legend()
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(f"{output_dir}/memory_usage.png")
        plt.close()
        
        # Combined Plot
        plt.figure(figsize=(12, 8))
        plt.subplot(2, 1, 1)
        plt.plot(timestamps, cpu_usage, label='CPU Usage %', color='blue')
        plt.title('System Resource Usage')
        plt.ylabel('CPU Usage (%)')
        plt.legend()
        
        plt.subplot(2, 1, 2)
        plt.plot(timestamps, memory_usage, label='Memory Usage %', color='red')
        plt.xlabel('Time')
        plt.ylabel('Memory Usage (%)')
        plt.legend()
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        plt.savefig(f"{output_dir}/combined_usage.png")
        plt.close()
        
        print(f"Performance plots saved to {output_dir}/")

async def run_performance_tests():
    """Run comprehensive performance tests"""
    
    monitor = PerformanceMonitor()
    
    print("🚀 Starting Performance Tests for PEGASUS Summarization Service")
    
    # Test texts of various sizes
    test_texts = [
        "Short text for testing basic functionality.",
        "Medium length text that should be processed efficiently. " * 20,
        "Long text that may require chunking for processing. " * 100,
        "Very long text that will definitely require chunking and consolidation. " * 200
    ]
    
    # 1. Basic health check
    print("\n1. Checking service health...")
    health = await monitor.check_service_health()
    print(f"Service status: {health.get('status', 'unknown')}")
    
    if health.get("status") != "healthy":
        print("❌ Service is not healthy, skipping performance tests")
        return
    
    # 2. Test summarization performance
    print("\n2. Testing summarization performance with various text sizes...")
    perf_results = await monitor.test_summarization_performance(test_texts)
    
    for result in perf_results:
        if result["status"] == "success":
            print(f"   Text length: {result['text_length']:,} chars - "
                  f"Response time: {result['response_time']:.2f}s - "
                  f"Chunks: {result['chunks_processed']}")
        else:
            print(f"   Text length: {result['text_length']:,} chars - "
                  f"Status: {result['status']}")
    
    # 3. Test concurrent performance
    print("\n3. Testing concurrent request performance...")
    concurrent_result = await monitor.test_concurrent_performance(test_texts[1], 3)
    print(f"   Concurrent requests: {concurrent_result['total_requests']}")
    print(f"   Successful: {concurrent_result['successful_requests']}")
    print(f"   Average response time: {concurrent_result['average_response_time']:.2f}s")
    print(f"   Requests per second: {concurrent_result['requests_per_second']:.2f}")
    
    # 4. Test caching performance
    print("\n4. Testing caching effectiveness...")
    cache_result = await monitor.test_caching_performance(test_texts[1])
    print(f"   First request: {cache_result['first_request_time']:.2f}s")
    print(f"   Second request: {cache_result['second_request_time']:.2f}s")
    print(f"   Speedup: {cache_result['speedup']:.1f}x")
    print(f"   Cache effective: {cache_result['cache_effective']}")
    
    # 5. Collect system metrics
    print("\n5. Collecting system metrics...")
    metrics = await monitor.collect_metrics()
    resources = metrics.get("resources", {})
    print(f"   CPU usage: {resources.get('cpu_percent', 0):.1f}%")
    print(f"   Memory usage: {resources.get('memory_percent', 0):.1f}%")
    print(f"   Available memory: {resources.get('available_memory_gb', 0):.1f}GB")
    
    # Generate report
    print("\n6. Generating performance report...")
    report = monitor.generate_performance_report("performance_test_report.json")
    
    print("\n✅ Performance tests completed successfully!")
    print("📊 Check performance_test_report.json for detailed results")

async def run_continuous_monitoring(duration_minutes: int = 10, interval_seconds: int = 30):
    """Run continuous performance monitoring"""
    
    monitor = PerformanceMonitor()
    
    print(f"🔍 Starting continuous monitoring for {duration_minutes} minutes")
    print(f"📊 Collecting metrics every {interval_seconds} seconds")
    
    end_time = time.time() + (duration_minutes * 60)
    
    while time.time() < end_time:
        try:
            metrics = await monitor.collect_metrics()
            resources = metrics.get("resources", {})
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                  f"CPU: {resources.get('cpu_percent', 0):.1f}% | "
                  f"Memory: {resources.get('memory_percent', 0):.1f}% | "
                  f"Status: {metrics.get('health', {}).get('status', 'unknown')}")
            
            await asyncio.sleep(interval_seconds)
            
        except KeyboardInterrupt:
            print("\n⏹️  Monitoring stopped by user")
            break
        except Exception as e:
            print(f"❌ Error during monitoring: {str(e)}")
            await asyncio.sleep(interval_seconds)
    
    # Generate final report and plots
    print("\n📈 Generating final report and visualizations...")
    monitor.generate_performance_report("continuous_monitoring_report.json")
    monitor.plot_metrics("monitoring_plots")
    
    print("✅ Continuous monitoring completed!")

def main():
    parser = argparse.ArgumentParser(description="Performance monitoring for PEGASUS summarization service")
    parser.add_argument("--mode", choices=["test", "monitor"], default="test",
                       help="Run performance tests or continuous monitoring")
    parser.add_argument("--duration", type=int, default=10,
                       help="Duration for continuous monitoring (minutes)")
    parser.add_argument("--interval", type=int, default=30,
                       help="Interval for continuous monitoring (seconds)")
    parser.add_argument("--service-url", default="http://localhost:8001",
                       help="URL of the summarization service")
    
    args = parser.parse_args()
    
    if args.mode == "test":
        asyncio.run(run_performance_tests())
    elif args.mode == "monitor":
        asyncio.run(run_continuous_monitoring(args.duration, args.interval))

if __name__ == "__main__":
    main()