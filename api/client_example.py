"""
ECU Binary Compare API - Python Client Example
Demonstrates how to use the API from your application
"""

import requests
import json
import zipfile
import io

# Configuration
API_BASE_URL = "http://localhost:5000/api"


class ECUCompareClient:
    """Python client for ECU Binary Compare API"""

    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url

    def health_check(self) -> dict:
        """Check API health status"""
        response = requests.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()

    def compare_files(self, file_a_path: str, file_b_path: str) -> dict:
        """
        Compare two binary files

        Args:
            file_a_path: Path to original binary file
            file_b_path: Path to modified binary file

        Returns:
            Comparison result as dictionary
        """
        with open(file_a_path, 'rb') as f_a, open(file_b_path, 'rb') as f_b:
            files = {
                'file_a': (file_a_path, f_a, 'application/octet-stream'),
                'file_b': (file_b_path, f_b, 'application/octet-stream')
            }
            response = requests.post(
                f"{self.base_url}/compare",
                files=files
            )
        response.raise_for_status()
        return response.json()

    def compare_with_maps(
        self,
        file_a_path: str,
        file_b_path: str,
        a2l_path: str
    ) -> dict:
        """
        Compare files with A2L map definitions

        Args:
            file_a_path: Path to original binary file
            file_b_path: Path to modified binary file
            a2l_path: Path to A2L definition file

        Returns:
            Comparison result with mapped parameters
        """
        with open(file_a_path, 'rb') as f_a, \
             open(file_b_path, 'rb') as f_b, \
             open(a2l_path, 'rb') as f_a2l:

            files = {
                'file_a': (file_a_path, f_a, 'application/octet-stream'),
                'file_b': (file_b_path, f_b, 'application/octet-stream'),
                'a2l_file': (a2l_path, f_a2l, 'text/plain')
            }
            response = requests.post(
                f"{self.base_url}/compare-with-maps",
                files=files
            )
        response.raise_for_status()
        return response.json()

    def get_demo_comparison(self) -> dict:
        """Get demo comparison with sample ECU data"""
        response = requests.get(f"{self.base_url}/demo")
        response.raise_for_status()
        return response.json()

    def download_demo_files(self, output_path: str = "ecu_demo.zip"):
        """Download demo files for testing"""
        response = requests.get(f"{self.base_url}/demo/files")
        response.raise_for_status()

        with open(output_path, 'wb') as f:
            f.write(response.content)

        print(f"Downloaded demo files to {output_path}")
        return output_path

    def parse_a2l(self, a2l_path: str) -> dict:
        """Parse an A2L file"""
        with open(a2l_path, 'rb') as f:
            files = {'file': (a2l_path, f, 'text/plain')}
            response = requests.post(
                f"{self.base_url}/parse-a2l",
                files=files
            )
        response.raise_for_status()
        return response.json()

    def save_json(self, data: dict, output_path: str):
        """Save comparison result as JSON"""
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Saved JSON to {output_path}")

    def save_csv(self, data: dict, output_path: str):
        """Export comparison as CSV"""
        lines = ['Offset,Length,Change Type,Parameter,Parameter Type']
        for diff in data.get('differences', []):
            lines.append(','.join([
                str(diff.get('offset', '0x0')),
                str(diff.get('length', 0)),
                str(diff.get('change_type', 'UNKNOWN')),
                str(diff.get('parameter', '-')),
                str(diff.get('parameter_type', '-'))
            ]))

        with open(output_path, 'w') as f:
            f.write('\n'.join(lines))
        print(f"Saved CSV to {output_path}")


# Example usage
def main():
    client = ECUCompareClient()

    # Check API health
    print("Checking API health...")
    health = client.health_check()
    print(f"API Status: {health}")

    # Get demo comparison
    print("\nFetching demo comparison...")
    demo = client.get_demo_comparison()
    print(f"Found {demo['statistics']['bytes_changed']} bytes changed")

    # Save demo result as JSON
    client.save_json(demo, "demo_comparison.json")

    # Example with real files (uncomment when you have files)
    # print("\nComparing real files...")
    # result = client.compare_files("original.bin", "modified.bin")
    # client.save_json(result, "my_comparison.json")

    # Example with A2L
    # print("\nComparing with A2L maps...")
    # result = client.compare_with_maps(
    #     "original.bin",
    #     "modified.bin",
    #     "definitions.a2l"
    # )
    # client.save_json(result, "my_comparison_mapped.json")


if __name__ == "__main__":
    main()
