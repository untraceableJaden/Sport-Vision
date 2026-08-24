#!/usr/bin/env python3
"""
Backend API Test Suite for SportVision AI Pro
Tests all API endpoints with real Gemini API integration
"""

import requests
import json
import time
import sys

# Configuration
BASE_URL = "https://motion-insights-6.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"
GEMINI_API_KEY = "AIzaSyBlXAXmziBxGMNVbPiPKnpHLbsa7cCLTJA"
TEST_VIDEO_PATH = "/tmp/test_sport.mp4"

# Test results tracking
test_results = []
analysis_id = None
analysis_id_a = None
analysis_id_b = None

def log_test(test_name, passed, details):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status}: {test_name}")
    print(f"Details: {details}")
    test_results.append({
        "test": test_name,
        "passed": passed,
        "details": details
    })

def test_1_get_sports():
    """Test 1: GET /api/sports - should return 20 sport objects"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/sports")
    print("="*80)
    
    try:
        response = requests.get(f"{API_BASE}/sports", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/sports", False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response type: {type(data)}")
        print(f"Number of sports: {len(data) if isinstance(data, list) else 'N/A'}")
        
        if not isinstance(data, list):
            log_test("GET /api/sports", False, f"Expected array, got {type(data)}")
            return False
        
        if len(data) != 20:
            log_test("GET /api/sports", False, f"Expected 20 sports, got {len(data)}")
            return False
        
        # Verify structure of first sport
        if data:
            sport = data[0]
            required_fields = ['id', 'name', 'emoji', 'category', 'description', 'focusMetrics']
            missing = [f for f in required_fields if f not in sport]
            if missing:
                log_test("GET /api/sports", False, f"Missing fields in sport object: {missing}")
                return False
            print(f"Sample sport: {sport['name']} {sport['emoji']} ({sport['category']})")
        
        log_test("GET /api/sports", True, f"Successfully retrieved {len(data)} sports")
        return True
        
    except Exception as e:
        log_test("GET /api/sports", False, f"Exception: {str(e)}")
        return False

def test_2_get_history_initial():
    """Test 2: GET /api/history - should return array (may be empty)"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/history (initial)")
    print("="*80)
    
    try:
        response = requests.get(f"{API_BASE}/history", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/history (initial)", False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response type: {type(data)}")
        print(f"Number of history items: {len(data) if isinstance(data, list) else 'N/A'}")
        
        if not isinstance(data, list):
            log_test("GET /api/history (initial)", False, f"Expected array, got {type(data)}")
            return False
        
        if data:
            print(f"Sample history item keys: {list(data[0].keys())}")
        
        log_test("GET /api/history (initial)", True, f"Successfully retrieved history array with {len(data)} items")
        return True
        
    except Exception as e:
        log_test("GET /api/history (initial)", False, f"Exception: {str(e)}")
        return False

def test_3_post_analysis_start():
    """Test 3: POST /api/analysis/start - upload video and analyze"""
    global analysis_id
    
    print("\n" + "="*80)
    print("TEST 3: POST /api/analysis/start (REAL GEMINI ANALYSIS - may take 60-90s)")
    print("="*80)
    
    try:
        # Prepare multipart form data
        with open(TEST_VIDEO_PATH, 'rb') as video_file:
            files = {
                'video': ('test_sport.mp4', video_file, 'video/mp4')
            }
            data = {
                'sportId': 'gymnastics',
                'model': 'gemini-2.5-flash'
            }
            headers = {
                'x-gemini-api-key': GEMINI_API_KEY
            }
            
            print(f"Uploading video: {TEST_VIDEO_PATH}")
            print(f"Sport: gymnastics, Model: gemini-2.5-flash")
            print("Waiting for Gemini analysis (timeout: 120s)...")
            
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/analysis/start",
                files=files,
                data=data,
                headers=headers,
                timeout=120
            )
            elapsed = time.time() - start_time
            
            print(f"Status Code: {response.status_code}")
            print(f"Time taken: {elapsed:.1f}s")
        
        if response.status_code != 200:
            log_test("POST /api/analysis/start", False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        result = response.json()
        print(f"Response keys: {list(result.keys())}")
        
        # Verify required fields
        required_fields = ['id', 'sportId', 'sportName', 'sportEmoji', 'model', 'fileName', 
                          'fileUri', 'mimeType', 'analysis', 'chatHistory', 'createdAt']
        missing = [f for f in required_fields if f not in result]
        if missing:
            log_test("POST /api/analysis/start", False, f"Missing fields: {missing}")
            return False
        
        # Verify analysis structure
        analysis = result.get('analysis', {})
        required_analysis_fields = ['summary', 'radar', 'metrics', 'events', 'insights', 'unavailableMetrics']
        missing_analysis = [f for f in required_analysis_fields if f not in analysis]
        if missing_analysis:
            log_test("POST /api/analysis/start", False, f"Missing analysis fields: {missing_analysis}")
            return False
        
        # Verify radar has 6 numeric keys
        radar = analysis.get('radar', {})
        required_radar_keys = ['power', 'accuracy', 'consistency', 'agility', 'formIntegrity', 'stamina']
        missing_radar = [k for k in required_radar_keys if k not in radar]
        if missing_radar:
            log_test("POST /api/analysis/start", False, f"Missing radar keys: {missing_radar}")
            return False
        
        # Verify radar values are numeric
        for key, value in radar.items():
            if not isinstance(value, (int, float)):
                log_test("POST /api/analysis/start", False, f"Radar key '{key}' is not numeric: {value}")
                return False
        
        # Verify metrics array structure
        metrics = analysis.get('metrics', [])
        if not isinstance(metrics, list):
            log_test("POST /api/analysis/start", False, f"Metrics is not an array")
            return False
        
        if metrics:
            metric = metrics[0]
            required_metric_fields = ['name', 'unit', 'confidence', 'evidence']
            missing_metric = [f for f in required_metric_fields if f not in metric]
            if missing_metric:
                log_test("POST /api/analysis/start", False, f"Missing metric fields: {missing_metric}")
                return False
        
        # Verify events array structure
        events = analysis.get('events', [])
        if not isinstance(events, list):
            log_test("POST /api/analysis/start", False, f"Events is not an array")
            return False
        
        if events:
            event = events[0]
            required_event_fields = ['type', 'timestampSeconds', 'confidence', 'description', 'severity']
            missing_event = [f for f in required_event_fields if f not in event]
            if missing_event:
                log_test("POST /api/analysis/start", False, f"Missing event fields: {missing_event}")
                return False
            
            if event['severity'] not in ['good', 'neutral', 'warning']:
                log_test("POST /api/analysis/start", False, f"Invalid severity: {event['severity']}")
                return False
        
        # Verify insights array structure
        insights = analysis.get('insights', [])
        if not isinstance(insights, list):
            log_test("POST /api/analysis/start", False, f"Insights is not an array")
            return False
        
        if insights:
            insight = insights[0]
            required_insight_fields = ['title', 'finding', 'confidence', 'category']
            missing_insight = [f for f in required_insight_fields if f not in insight]
            if missing_insight:
                log_test("POST /api/analysis/start", False, f"Missing insight fields: {missing_insight}")
                return False
            
            if insight['category'] not in ['biomechanics', 'tactical', 'injury_prevention', 'technique']:
                log_test("POST /api/analysis/start", False, f"Invalid category: {insight['category']}")
                return False
        
        # Save analysis ID for later tests
        analysis_id = result['id']
        
        print(f"\n✓ Analysis ID: {analysis_id}")
        print(f"✓ Sport: {result['sportName']} {result['sportEmoji']}")
        print(f"✓ Model: {result['model']}")
        print(f"✓ File URI: {result['fileUri'][:50]}...")
        print(f"✓ Summary: {analysis['summary'][:100]}...")
        print(f"✓ Radar scores: {radar}")
        print(f"✓ Metrics count: {len(metrics)}")
        print(f"✓ Events count: {len(events)}")
        print(f"✓ Insights count: {len(insights)}")
        print(f"✓ Unavailable metrics count: {len(analysis.get('unavailableMetrics', []))}")
        
        log_test("POST /api/analysis/start", True, f"Successfully analyzed video in {elapsed:.1f}s, ID: {analysis_id}")
        return True
        
    except requests.exceptions.Timeout:
        log_test("POST /api/analysis/start", False, "Request timeout (>120s)")
        return False
    except Exception as e:
        log_test("POST /api/analysis/start", False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_4_get_analysis_by_id():
    """Test 4: GET /api/analysis/:id - retrieve stored analysis"""
    print("\n" + "="*80)
    print(f"TEST 4: GET /api/analysis/{analysis_id}")
    print("="*80)
    
    if not analysis_id:
        log_test("GET /api/analysis/:id", False, "No analysis_id from previous test")
        return False
    
    try:
        response = requests.get(f"{API_BASE}/analysis/{analysis_id}", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/analysis/:id", False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        result = response.json()
        print(f"Response keys: {list(result.keys())}")
        
        # Verify it matches the stored document structure
        if result.get('id') != analysis_id:
            log_test("GET /api/analysis/:id", False, f"ID mismatch: expected {analysis_id}, got {result.get('id')}")
            return False
        
        if 'analysis' not in result:
            log_test("GET /api/analysis/:id", False, "Missing 'analysis' field")
            return False
        
        print(f"✓ Retrieved analysis for ID: {analysis_id}")
        print(f"✓ Sport: {result.get('sportName')}")
        print(f"✓ Has analysis data: {bool(result.get('analysis'))}")
        
        log_test("GET /api/analysis/:id", True, f"Successfully retrieved analysis {analysis_id}")
        return True
        
    except Exception as e:
        log_test("GET /api/analysis/:id", False, f"Exception: {str(e)}")
        return False

def test_5_post_chat():
    """Test 5: POST /api/analysis/:id/chat - ask question about video"""
    print("\n" + "="*80)
    print(f"TEST 5: POST /api/analysis/{analysis_id}/chat")
    print("="*80)
    
    if not analysis_id:
        log_test("POST /api/analysis/:id/chat", False, "No analysis_id from previous test")
        return False
    
    try:
        headers = {
            'Content-Type': 'application/json',
            'x-gemini-api-key': GEMINI_API_KEY
        }
        payload = {
            'question': 'What happens in this video and what should be improved?'
        }
        
        print(f"Question: {payload['question']}")
        print("Waiting for Gemini response (timeout: 60s)...")
        
        start_time = time.time()
        response = requests.post(
            f"{API_BASE}/analysis/{analysis_id}/chat",
            json=payload,
            headers=headers,
            timeout=60
        )
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Time taken: {elapsed:.1f}s")
        
        if response.status_code != 200:
            log_test("POST /api/analysis/:id/chat", False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        result = response.json()
        print(f"Response keys: {list(result.keys())}")
        
        if 'answer' not in result:
            log_test("POST /api/analysis/:id/chat", False, "Missing 'answer' field")
            return False
        
        answer = result['answer']
        if not answer or not isinstance(answer, str) or len(answer.strip()) == 0:
            log_test("POST /api/analysis/:id/chat", False, f"Answer is empty or invalid: {answer}")
            return False
        
        print(f"✓ Answer length: {len(answer)} characters")
        print(f"✓ Answer preview: {answer[:150]}...")
        
        log_test("POST /api/analysis/:id/chat", True, f"Successfully got chat response ({len(answer)} chars)")
        return True
        
    except requests.exceptions.Timeout:
        log_test("POST /api/analysis/:id/chat", False, "Request timeout (>60s)")
        return False
    except Exception as e:
        log_test("POST /api/analysis/:id/chat", False, f"Exception: {str(e)}")
        return False

def test_6_get_chat_history():
    """Test 6: GET /api/analysis/:id/chat - retrieve chat history"""
    print("\n" + "="*80)
    print(f"TEST 6: GET /api/analysis/{analysis_id}/chat")
    print("="*80)
    
    if not analysis_id:
        log_test("GET /api/analysis/:id/chat", False, "No analysis_id from previous test")
        return False
    
    try:
        response = requests.get(f"{API_BASE}/analysis/{analysis_id}/chat", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/analysis/:id/chat", False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        history = response.json()
        print(f"Response type: {type(history)}")
        print(f"Chat history length: {len(history) if isinstance(history, list) else 'N/A'}")
        
        if not isinstance(history, list):
            log_test("GET /api/analysis/:id/chat", False, f"Expected array, got {type(history)}")
            return False
        
        if len(history) != 2:
            log_test("GET /api/analysis/:id/chat", False, f"Expected 2 entries (user + model), got {len(history)}")
            return False
        
        # Verify structure
        user_entry = history[0]
        model_entry = history[1]
        
        if user_entry.get('role') != 'user':
            log_test("GET /api/analysis/:id/chat", False, f"First entry should be role='user', got {user_entry.get('role')}")
            return False
        
        if model_entry.get('role') != 'model':
            log_test("GET /api/analysis/:id/chat", False, f"Second entry should be role='model', got {model_entry.get('role')}")
            return False
        
        print(f"✓ User message: {user_entry.get('text', '')[:50]}...")
        print(f"✓ Model response: {model_entry.get('text', '')[:50]}...")
        
        log_test("GET /api/analysis/:id/chat", True, f"Successfully retrieved chat history with 2 entries")
        return True
        
    except Exception as e:
        log_test("GET /api/analysis/:id/chat", False, f"Exception: {str(e)}")
        return False

def test_7_get_history_after_analysis():
    """Test 7: GET /api/history - verify new analysis appears"""
    print("\n" + "="*80)
    print("TEST 7: GET /api/history (after analysis)")
    print("="*80)
    
    if not analysis_id:
        log_test("GET /api/history (after analysis)", False, "No analysis_id from previous test")
        return False
    
    try:
        response = requests.get(f"{API_BASE}/history", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/history (after analysis)", False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Number of history items: {len(data)}")
        
        if not isinstance(data, list):
            log_test("GET /api/history (after analysis)", False, f"Expected array, got {type(data)}")
            return False
        
        # Check if our analysis is in the history
        found = False
        for item in data:
            if item.get('id') == analysis_id:
                found = True
                print(f"✓ Found our analysis in history:")
                print(f"  - ID: {item.get('id')}")
                print(f"  - Sport: {item.get('sportName')} {item.get('sportEmoji')}")
                print(f"  - Model: {item.get('model')}")
                print(f"  - Summary: {item.get('analysis', {}).get('summary', '')[:50]}...")
                break
        
        if not found:
            log_test("GET /api/history (after analysis)", False, f"Analysis {analysis_id} not found in history")
            return False
        
        log_test("GET /api/history (after analysis)", True, f"Analysis {analysis_id} appears in history")
        return True
        
    except Exception as e:
        log_test("GET /api/history (after analysis)", False, f"Exception: {str(e)}")
        return False

def test_8a_missing_api_key():
    """Test 8a: POST /api/analysis/start without x-gemini-api-key header"""
    print("\n" + "="*80)
    print("TEST 8a: POST /api/analysis/start (missing API key)")
    print("="*80)
    
    try:
        with open(TEST_VIDEO_PATH, 'rb') as video_file:
            files = {
                'video': ('test_sport.mp4', video_file, 'video/mp4')
            }
            data = {
                'sportId': 'gymnastics',
                'model': 'gemini-2.5-flash'
            }
            # Intentionally omit x-gemini-api-key header
            
            response = requests.post(
                f"{API_BASE}/analysis/start",
                files=files,
                data=data,
                timeout=10
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
        
        if response.status_code != 400:
            log_test("POST /api/analysis/start (missing API key)", False, 
                    f"Expected 400, got {response.status_code}")
            return False
        
        result = response.json()
        if 'error' not in result:
            log_test("POST /api/analysis/start (missing API key)", False, 
                    "Expected error message in response")
            return False
        
        print(f"✓ Error message: {result['error']}")
        
        log_test("POST /api/analysis/start (missing API key)", True, 
                f"Correctly returned 400 with error message")
        return True
        
    except Exception as e:
        log_test("POST /api/analysis/start (missing API key)", False, f"Exception: {str(e)}")
        return False

def test_8b_missing_video():
    """Test 8b: POST /api/analysis/start without video file"""
    print("\n" + "="*80)
    print("TEST 8b: POST /api/analysis/start (missing video)")
    print("="*80)
    
    try:
        data = {
            'sportId': 'gymnastics',
            'model': 'gemini-2.5-flash'
        }
        headers = {
            'x-gemini-api-key': GEMINI_API_KEY
        }
        # Intentionally omit video file
        
        response = requests.post(
            f"{API_BASE}/analysis/start",
            data=data,
            headers=headers,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400:
            log_test("POST /api/analysis/start (missing video)", False, 
                    f"Expected 400, got {response.status_code}")
            return False
        
        result = response.json()
        if 'error' not in result:
            log_test("POST /api/analysis/start (missing video)", False, 
                    "Expected error message in response")
            return False
        
        print(f"✓ Error message: {result['error']}")
        
        log_test("POST /api/analysis/start (missing video)", True, 
                f"Correctly returned 400 with error message")
        return True
        
    except Exception as e:
        log_test("POST /api/analysis/start (missing video)", False, f"Exception: {str(e)}")
        return False

def test_8c_invalid_sport():
    """Test 8c: POST /api/analysis/start with invalid sportId"""
    print("\n" + "="*80)
    print("TEST 8c: POST /api/analysis/start (invalid sportId)")
    print("="*80)
    
    try:
        with open(TEST_VIDEO_PATH, 'rb') as video_file:
            files = {
                'video': ('test_sport.mp4', video_file, 'video/mp4')
            }
            data = {
                'sportId': 'not_a_real_sport',  # Invalid sport ID
                'model': 'gemini-2.5-flash'
            }
            headers = {
                'x-gemini-api-key': GEMINI_API_KEY
            }
            
            response = requests.post(
                f"{API_BASE}/analysis/start",
                files=files,
                data=data,
                headers=headers,
                timeout=10
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
        
        if response.status_code != 400:
            log_test("POST /api/analysis/start (invalid sportId)", False, 
                    f"Expected 400, got {response.status_code}")
            return False
        
        result = response.json()
        if 'error' not in result:
            log_test("POST /api/analysis/start (invalid sportId)", False, 
                    "Expected error message in response")
            return False
        
        print(f"✓ Error message: {result['error']}")
        
        log_test("POST /api/analysis/start (invalid sportId)", True, 
                f"Correctly returned 400 with error message")
        return True
        
    except Exception as e:
        log_test("POST /api/analysis/start (invalid sportId)", False, f"Exception: {str(e)}")
        return False

def test_9_get_history_for_comparison():
    """Test 9: GET /api/history - get 2 analysis IDs for comparison"""
    global analysis_id_a, analysis_id_b
    
    print("\n" + "="*80)
    print("TEST 9: GET /api/history (to find 2 IDs for comparison)")
    print("="*80)
    
    try:
        response = requests.get(f"{API_BASE}/history", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/history (for comparison)", False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Number of history items: {len(data)}")
        
        if not isinstance(data, list):
            log_test("GET /api/history (for comparison)", False, f"Expected array, got {type(data)}")
            return False
        
        if len(data) < 2:
            log_test("GET /api/history (for comparison)", False, f"Need at least 2 analyses for comparison, found {len(data)}")
            return False
        
        # Get first 2 analysis IDs
        analysis_id_a = data[0].get('id')
        analysis_id_b = data[1].get('id')
        
        if not analysis_id_a or not analysis_id_b:
            log_test("GET /api/history (for comparison)", False, "Could not extract valid IDs from history")
            return False
        
        print(f"✓ Analysis A ID: {analysis_id_a}")
        print(f"✓ Analysis B ID: {analysis_id_b}")
        print(f"✓ Analysis A: {data[0].get('sportName')} {data[0].get('sportEmoji')}")
        print(f"✓ Analysis B: {data[1].get('sportName')} {data[1].get('sportEmoji')}")
        
        log_test("GET /api/history (for comparison)", True, f"Found 2 valid analysis IDs for comparison")
        return True
        
    except Exception as e:
        log_test("GET /api/history (for comparison)", False, f"Exception: {str(e)}")
        return False

def test_10_compare_with_flash():
    """Test 10: POST /api/analysis/compare with gemini-3.6-flash"""
    print("\n" + "="*80)
    print("TEST 10: POST /api/analysis/compare (gemini-3.6-flash)")
    print("="*80)
    
    if not analysis_id_a or not analysis_id_b:
        log_test("POST /api/analysis/compare (flash)", False, "No analysis IDs from previous test")
        return False
    
    try:
        headers = {
            'Content-Type': 'application/json',
            'x-gemini-api-key': GEMINI_API_KEY
        }
        payload = {
            'idA': analysis_id_a,
            'idB': analysis_id_b,
            'model': 'gemini-3.6-flash'
        }
        
        print(f"Comparing: {analysis_id_a} vs {analysis_id_b}")
        print(f"Model: gemini-3.6-flash")
        print("Waiting for Gemini comparison (timeout: 60s)...")
        
        start_time = time.time()
        response = requests.post(
            f"{API_BASE}/analysis/compare",
            json=payload,
            headers=headers,
            timeout=60
        )
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Time taken: {elapsed:.1f}s")
        
        if response.status_code != 200:
            log_test("POST /api/analysis/compare (flash)", False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        result = response.json()
        print(f"Response keys: {list(result.keys())}")
        
        # Verify top-level fields
        required_top_fields = ['comparison', 'modelUsed', 'fallbackApplied']
        missing_top = [f for f in required_top_fields if f not in result]
        if missing_top:
            log_test("POST /api/analysis/compare (flash)", False, f"Missing top-level fields: {missing_top}")
            return False
        
        if result['modelUsed'] != 'gemini-3.6-flash':
            log_test("POST /api/analysis/compare (flash)", False, f"Expected modelUsed='gemini-3.6-flash', got {result['modelUsed']}")
            return False
        
        if result['fallbackApplied'] != False:
            log_test("POST /api/analysis/compare (flash)", False, f"Expected fallbackApplied=false, got {result['fallbackApplied']}")
            return False
        
        # Verify comparison object structure
        comparison = result.get('comparison', {})
        required_comparison_fields = [
            'overallVerdict', 'trajectoryDirection', 'performanceSummary',
            'tacticalDifferences', 'techniqueProgression',
            'strengthsA', 'strengthsB', 'weaknessesA', 'weaknessesB',
            'recommendations'
        ]
        missing_comparison = [f for f in required_comparison_fields if f not in comparison]
        if missing_comparison:
            log_test("POST /api/analysis/compare (flash)", False, f"Missing comparison fields: {missing_comparison}")
            return False
        
        # Verify trajectoryDirection enum
        if comparison['trajectoryDirection'] not in ['improved', 'declined', 'mixed', 'similar']:
            log_test("POST /api/analysis/compare (flash)", False, f"Invalid trajectoryDirection: {comparison['trajectoryDirection']}")
            return False
        
        # Verify array fields
        if not isinstance(comparison['tacticalDifferences'], list):
            log_test("POST /api/analysis/compare (flash)", False, "tacticalDifferences is not an array")
            return False
        
        if not isinstance(comparison['techniqueProgression'], list):
            log_test("POST /api/analysis/compare (flash)", False, "techniqueProgression is not an array")
            return False
        
        if not isinstance(comparison['strengthsA'], list):
            log_test("POST /api/analysis/compare (flash)", False, "strengthsA is not an array")
            return False
        
        if not isinstance(comparison['strengthsB'], list):
            log_test("POST /api/analysis/compare (flash)", False, "strengthsB is not an array")
            return False
        
        if not isinstance(comparison['weaknessesA'], list):
            log_test("POST /api/analysis/compare (flash)", False, "weaknessesA is not an array")
            return False
        
        if not isinstance(comparison['weaknessesB'], list):
            log_test("POST /api/analysis/compare (flash)", False, "weaknessesB is not an array")
            return False
        
        if not isinstance(comparison['recommendations'], list):
            log_test("POST /api/analysis/compare (flash)", False, "recommendations is not an array")
            return False
        
        # Verify tacticalDifferences structure
        if comparison['tacticalDifferences']:
            td = comparison['tacticalDifferences'][0]
            required_td_fields = ['aspect', 'sessionA', 'sessionB', 'verdict']
            missing_td = [f for f in required_td_fields if f not in td]
            if missing_td:
                log_test("POST /api/analysis/compare (flash)", False, f"Missing tacticalDifferences fields: {missing_td}")
                return False
        
        # Verify techniqueProgression structure
        if comparison['techniqueProgression']:
            tp = comparison['techniqueProgression'][0]
            required_tp_fields = ['area', 'change', 'detail']
            missing_tp = [f for f in required_tp_fields if f not in tp]
            if missing_tp:
                log_test("POST /api/analysis/compare (flash)", False, f"Missing techniqueProgression fields: {missing_tp}")
                return False
            
            if tp['change'] not in ['improved', 'declined', 'unchanged']:
                log_test("POST /api/analysis/compare (flash)", False, f"Invalid techniqueProgression change: {tp['change']}")
                return False
        
        # Verify recommendations structure
        if comparison['recommendations']:
            rec = comparison['recommendations'][0]
            required_rec_fields = ['priority', 'title', 'detail']
            missing_rec = [f for f in required_rec_fields if f not in rec]
            if missing_rec:
                log_test("POST /api/analysis/compare (flash)", False, f"Missing recommendations fields: {missing_rec}")
                return False
            
            if rec['priority'] not in ['high', 'medium', 'low']:
                log_test("POST /api/analysis/compare (flash)", False, f"Invalid recommendation priority: {rec['priority']}")
                return False
        
        print(f"\n✓ Model Used: {result['modelUsed']}")
        print(f"✓ Fallback Applied: {result['fallbackApplied']}")
        print(f"✓ Overall Verdict: {comparison['overallVerdict'][:100]}...")
        print(f"✓ Trajectory Direction: {comparison['trajectoryDirection']}")
        print(f"✓ Performance Summary: {comparison['performanceSummary'][:100]}...")
        print(f"✓ Tactical Differences: {len(comparison['tacticalDifferences'])} items")
        print(f"✓ Technique Progression: {len(comparison['techniqueProgression'])} items")
        print(f"✓ Strengths A: {len(comparison['strengthsA'])} items")
        print(f"✓ Strengths B: {len(comparison['strengthsB'])} items")
        print(f"✓ Weaknesses A: {len(comparison['weaknessesA'])} items")
        print(f"✓ Weaknesses B: {len(comparison['weaknessesB'])} items")
        print(f"✓ Recommendations: {len(comparison['recommendations'])} items")
        
        log_test("POST /api/analysis/compare (flash)", True, f"Successfully compared analyses in {elapsed:.1f}s")
        return True
        
    except requests.exceptions.Timeout:
        log_test("POST /api/analysis/compare (flash)", False, "Request timeout (>60s)")
        return False
    except Exception as e:
        log_test("POST /api/analysis/compare (flash)", False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_11_compare_with_pro_fallback():
    """Test 11: POST /api/analysis/compare with gemini-3.1-pro-preview (should fallback)"""
    print("\n" + "="*80)
    print("TEST 11: POST /api/analysis/compare (gemini-3.1-pro-preview with fallback)")
    print("="*80)
    
    if not analysis_id_a or not analysis_id_b:
        log_test("POST /api/analysis/compare (pro fallback)", False, "No analysis IDs from previous test")
        return False
    
    try:
        headers = {
            'Content-Type': 'application/json',
            'x-gemini-api-key': GEMINI_API_KEY
        }
        payload = {
            'idA': analysis_id_a,
            'idB': analysis_id_b,
            'model': 'gemini-3.1-pro-preview'
        }
        
        print(f"Comparing: {analysis_id_a} vs {analysis_id_b}")
        print(f"Model: gemini-3.1-pro-preview (0 free quota, should fallback to flash)")
        print("Waiting for Gemini comparison (timeout: 60s)...")
        
        start_time = time.time()
        response = requests.post(
            f"{API_BASE}/analysis/compare",
            json=payload,
            headers=headers,
            timeout=60
        )
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Time taken: {elapsed:.1f}s")
        
        if response.status_code != 200:
            log_test("POST /api/analysis/compare (pro fallback)", False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        result = response.json()
        print(f"Response keys: {list(result.keys())}")
        
        # Verify fallback occurred
        if result.get('modelUsed') != 'gemini-3.6-flash':
            log_test("POST /api/analysis/compare (pro fallback)", False, f"Expected modelUsed='gemini-3.6-flash' after fallback, got {result.get('modelUsed')}")
            return False
        
        if result.get('fallbackApplied') != True:
            log_test("POST /api/analysis/compare (pro fallback)", False, f"Expected fallbackApplied=true, got {result.get('fallbackApplied')}")
            return False
        
        # Verify comparison object exists and has required fields
        comparison = result.get('comparison', {})
        if not comparison:
            log_test("POST /api/analysis/compare (pro fallback)", False, "Missing comparison object")
            return False
        
        required_fields = ['overallVerdict', 'trajectoryDirection', 'performanceSummary']
        missing = [f for f in required_fields if f not in comparison]
        if missing:
            log_test("POST /api/analysis/compare (pro fallback)", False, f"Missing comparison fields: {missing}")
            return False
        
        print(f"\n✓ Model Used: {result['modelUsed']} (fallback from gemini-3.1-pro-preview)")
        print(f"✓ Fallback Applied: {result['fallbackApplied']}")
        print(f"✓ Comparison object present with all required fields")
        
        log_test("POST /api/analysis/compare (pro fallback)", True, f"Successfully handled fallback in {elapsed:.1f}s")
        return True
        
    except requests.exceptions.Timeout:
        log_test("POST /api/analysis/compare (pro fallback)", False, "Request timeout (>60s)")
        return False
    except Exception as e:
        log_test("POST /api/analysis/compare (pro fallback)", False, f"Exception: {str(e)}")
        return False

def test_12_compare_missing_idA():
    """Test 12: POST /api/analysis/compare with missing idA"""
    print("\n" + "="*80)
    print("TEST 12: POST /api/analysis/compare (missing idA)")
    print("="*80)
    
    try:
        headers = {
            'Content-Type': 'application/json',
            'x-gemini-api-key': GEMINI_API_KEY
        }
        payload = {
            'idB': analysis_id_b,
            'model': 'gemini-3.6-flash'
        }
        # Intentionally omit idA
        
        response = requests.post(
            f"{API_BASE}/analysis/compare",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400:
            log_test("POST /api/analysis/compare (missing idA)", False, f"Expected 400, got {response.status_code}")
            return False
        
        result = response.json()
        if 'error' not in result:
            log_test("POST /api/analysis/compare (missing idA)", False, "Expected error message in response")
            return False
        
        print(f"✓ Error message: {result['error']}")
        
        log_test("POST /api/analysis/compare (missing idA)", True, "Correctly returned 400 with error message")
        return True
        
    except Exception as e:
        log_test("POST /api/analysis/compare (missing idA)", False, f"Exception: {str(e)}")
        return False

def test_13_compare_same_ids():
    """Test 13: POST /api/analysis/compare with idA == idB"""
    print("\n" + "="*80)
    print("TEST 13: POST /api/analysis/compare (idA == idB)")
    print("="*80)
    
    if not analysis_id_a:
        log_test("POST /api/analysis/compare (same IDs)", False, "No analysis ID from previous test")
        return False
    
    try:
        headers = {
            'Content-Type': 'application/json',
            'x-gemini-api-key': GEMINI_API_KEY
        }
        payload = {
            'idA': analysis_id_a,
            'idB': analysis_id_a,  # Same as idA
            'model': 'gemini-3.6-flash'
        }
        
        response = requests.post(
            f"{API_BASE}/analysis/compare",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400:
            log_test("POST /api/analysis/compare (same IDs)", False, f"Expected 400, got {response.status_code}")
            return False
        
        result = response.json()
        if 'error' not in result:
            log_test("POST /api/analysis/compare (same IDs)", False, "Expected error message in response")
            return False
        
        print(f"✓ Error message: {result['error']}")
        
        log_test("POST /api/analysis/compare (same IDs)", True, "Correctly returned 400 with error message")
        return True
        
    except Exception as e:
        log_test("POST /api/analysis/compare (same IDs)", False, f"Exception: {str(e)}")
        return False

def test_14_compare_bogus_id():
    """Test 14: POST /api/analysis/compare with bogus idA"""
    print("\n" + "="*80)
    print("TEST 14: POST /api/analysis/compare (bogus idA)")
    print("="*80)
    
    if not analysis_id_b:
        log_test("POST /api/analysis/compare (bogus ID)", False, "No analysis ID from previous test")
        return False
    
    try:
        headers = {
            'Content-Type': 'application/json',
            'x-gemini-api-key': GEMINI_API_KEY
        }
        payload = {
            'idA': '00000000-0000-0000-0000-000000000000',  # Bogus UUID
            'idB': analysis_id_b,
            'model': 'gemini-3.6-flash'
        }
        
        response = requests.post(
            f"{API_BASE}/analysis/compare",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 404:
            log_test("POST /api/analysis/compare (bogus ID)", False, f"Expected 404, got {response.status_code}")
            return False
        
        result = response.json()
        if 'error' not in result:
            log_test("POST /api/analysis/compare (bogus ID)", False, "Expected error message in response")
            return False
        
        print(f"✓ Error message: {result['error']}")
        
        log_test("POST /api/analysis/compare (bogus ID)", True, "Correctly returned 404 with error message")
        return True
        
    except Exception as e:
        log_test("POST /api/analysis/compare (bogus ID)", False, f"Exception: {str(e)}")
        return False

def test_15_compare_missing_api_key():
    """Test 15: POST /api/analysis/compare without x-gemini-api-key header"""
    print("\n" + "="*80)
    print("TEST 15: POST /api/analysis/compare (missing API key)")
    print("="*80)
    
    if not analysis_id_a or not analysis_id_b:
        log_test("POST /api/analysis/compare (missing API key)", False, "No analysis IDs from previous test")
        return False
    
    try:
        headers = {
            'Content-Type': 'application/json'
        }
        # Intentionally omit x-gemini-api-key header
        payload = {
            'idA': analysis_id_a,
            'idB': analysis_id_b,
            'model': 'gemini-3.6-flash'
        }
        
        response = requests.post(
            f"{API_BASE}/analysis/compare",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400:
            log_test("POST /api/analysis/compare (missing API key)", False, f"Expected 400, got {response.status_code}")
            return False
        
        result = response.json()
        if 'error' not in result:
            log_test("POST /api/analysis/compare (missing API key)", False, "Expected error message in response")
            return False
        
        print(f"✓ Error message: {result['error']}")
        
        log_test("POST /api/analysis/compare (missing API key)", True, "Correctly returned 400 with error message")
        return True
        
    except Exception as e:
        log_test("POST /api/analysis/compare (missing API key)", False, f"Exception: {str(e)}")
        return False

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for r in test_results if r['passed'])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total*100):.1f}%\n")
    
    for result in test_results:
        status = "✅" if result['passed'] else "❌"
        print(f"{status} {result['test']}")
    
    print("\n" + "="*80)
    
    return passed == total

def main():
    """Run all tests in sequence"""
    print("="*80)
    print("SportVision AI Pro - Backend API Test Suite")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test Video: {TEST_VIDEO_PATH}")
    print(f"Using BYOK Gemini API Key: {GEMINI_API_KEY[:20]}...")
    print("="*80)
    
    # Run tests in order
    test_1_get_sports()
    test_2_get_history_initial()
    test_3_post_analysis_start()
    
    # Only run subsequent tests if we have an analysis_id
    if analysis_id:
        test_4_get_analysis_by_id()
        test_5_post_chat()
        test_6_get_chat_history()
        test_7_get_history_after_analysis()
    else:
        print("\n⚠️  Skipping tests 4-7 because analysis creation failed")
    
    # Run negative tests
    test_8a_missing_api_key()
    test_8b_missing_video()
    test_8c_invalid_sport()
    
    # Run comparison tests (NEW)
    print("\n" + "="*80)
    print("COMPARISON ENDPOINT TESTS (NEW)")
    print("="*80)
    test_9_get_history_for_comparison()
    
    # Only run comparison tests if we have 2 analysis IDs
    if analysis_id_a and analysis_id_b:
        test_10_compare_with_flash()
        test_11_compare_with_pro_fallback()
        test_12_compare_missing_idA()
        test_13_compare_same_ids()
        test_14_compare_bogus_id()
        test_15_compare_missing_api_key()
    else:
        print("\n⚠️  Skipping comparison tests 10-15 because we don't have 2 analysis IDs")
    
    # Print summary
    all_passed = print_summary()
    
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
