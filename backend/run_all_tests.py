import unittest
import sys
import os

# Add current directory to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# Set dummy key for Tavily search import stability
os.environ["TAVILY_API_KEY"] = "dummy_tavily_key"

def run_tests():
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # List of test modules to load
    test_modules = [
        "test_verifier",
        "test_comparison",
        "test_phase11",
        "test_phase12",
        "test_phase13",
        "test_phase14",
        "test_phase15",
        "test_phase16",
        "test_phase17"
    ]
    
    for module_name in test_modules:
        try:
            print(f"Loading test module: {module_name}")
            module = __import__(module_name)
            suite.addTests(loader.loadTestsFromModule(module))
        except Exception as e:
            print(f"Error loading {module_name}: {e}")
            
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    sys.exit(0 if result.wasSuccessful() else 1)

if __name__ == "__main__":
    run_tests()
