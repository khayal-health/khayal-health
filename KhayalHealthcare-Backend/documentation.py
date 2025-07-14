import os
import sys
from pathlib import Path
from typing import List, Set

class DocumentationGenerator:
    def __init__(self, project_root: str, output_file: str = "documentation.md"):
        self.project_root = Path(project_root)
        self.output_file = output_file
        
        # Directories and file patterns to exclude
        self.exclude_dirs = {
            '__pycache__', '.git', '.venv', 'venv', 'env', 
            '.env', 'node_modules', '.pytest_cache', '.mypy_cache',
            'htmlcov', '.coverage', 'dist', 'build', '*.egg-info'
        }
        
        self.exclude_files = {
            '.pyc', '.pyo', '.pyd', '.so', '.dll', '.dylib',
            '.DS_Store', 'Thumbs.db', '.gitignore', '.dockerignore'
        }
        
        # File extensions to include in documentation
        self.include_extensions = {'.py'}
        
    def should_exclude_dir(self, dir_path: Path) -> bool:
        """Check if directory should be excluded"""
        dir_name = dir_path.name
        return (
            dir_name in self.exclude_dirs or
            dir_name.startswith('.') or
            dir_name.endswith('.egg-info')
        )
    
    def should_exclude_file(self, file_path: Path) -> bool:
        """Check if file should be excluded"""
        file_name = file_path.name
        
        # Check if it's a file we want to document
        if file_path.suffix not in self.include_extensions:
            return True
            
        # Check against exclude patterns
        for pattern in self.exclude_files:
            if pattern.startswith('*'):
                if file_name.endswith(pattern[1:]):
                    return True
            elif pattern.startswith('.'):
                if file_path.suffix == pattern or file_name == pattern:
                    return True
            elif file_name == pattern:
                return True
                
        return False
    
    def get_relative_path(self, file_path: Path) -> str:
        """Get relative path from project root"""
        try:
            return str(file_path.relative_to(self.project_root))
        except ValueError:
            return str(file_path)
    
    def read_file_content(self, file_path: Path) -> str:
        """Read file content with proper encoding handling"""
        encodings = ['utf-8', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    return f.read()
            except UnicodeDecodeError:
                continue
            except Exception as e:
                return f"# Error reading file: {str(e)}"
        
        return "# Could not read file with any supported encoding"
    
    def generate_file_documentation(self, file_path: Path) -> str:
        """Generate markdown documentation for a single file"""
        relative_path = self.get_relative_path(file_path)
        
        # Convert Windows path separators to forward slashes for consistency
        relative_path = relative_path.replace('\\', '/')
        
        content = self.read_file_content(file_path)
        
        # Create markdown section
        doc = f"\n## {relative_path}\n\n"
        doc += "```python\n"
        doc += content
        if not content.endswith('\n'):
            doc += '\n'
        doc += "```\n"
        
        return doc
    
    def walk_directory(self, start_path: Path) -> List[Path]:
        """Recursively walk directory and collect Python files"""
        python_files = []
        
        for root, dirs, files in os.walk(start_path):
            root_path = Path(root)
            
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if not self.should_exclude_dir(root_path / d)]
            
            # Process files
            for file in files:
                file_path = root_path / file
                if not self.should_exclude_file(file_path):
                    python_files.append(file_path)
        
        # Sort files for consistent output
        python_files.sort()
        return python_files
    
    def generate_table_of_contents(self, files: List[Path]) -> str:
        """Generate a table of contents"""
        toc = "## Table of Contents\n\n"
        
        # Group files by directory
        file_structure = {}
        for file_path in files:
            relative_path = self.get_relative_path(file_path)
            parts = relative_path.replace('\\', '/').split('/')
            
            current = file_structure
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]
            
            # Add file to structure
            if '__files__' not in current:
                current['__files__'] = []
            current['__files__'].append(parts[-1])
        
        # Generate TOC recursively
        def generate_toc_level(structure, level=0):
            result = ""
            indent = "  " * level
            
            # First, list directories
            for key in sorted(structure.keys()):
                if key != '__files__':
                    result += f"{indent}- **{key}/**\n"
                    result += generate_toc_level(structure[key], level + 1)
            
            # Then, list files
            if '__files__' in structure:
                for file in sorted(structure['__files__']):
                    file_link = file.replace('.py', '').replace('_', '-')
                    result += f"{indent}- [{file}](#{file_link})\n"
            
            return result
        
        toc += generate_toc_level(file_structure)
        return toc
    
    def generate_documentation(self):
        """Generate complete documentation"""
        print(f"Generating documentation for: {self.project_root}")
        
        # Collect all Python files
        python_files = self.walk_directory(self.project_root)
        
        if not python_files:
            print("No Python files found!")
            return
        
        print(f"Found {len(python_files)} Python files")
        
        # Start documentation
        doc_content = "# Khayal Healthcare Backend Documentation\n\n"
        doc_content += f"Generated from: `{self.project_root}`\n\n"
        doc_content += "---\n\n"
        
        # Add table of contents
        doc_content += self.generate_table_of_contents(python_files)
        doc_content += "\n---\n"
        
        # Add file documentation
        for file_path in python_files:
            print(f"Processing: {self.get_relative_path(file_path)}")
            doc_content += self.generate_file_documentation(file_path)
        
        # Write to output file
        output_path = Path(self.output_file)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(doc_content)
        
        print(f"\nDocumentation generated successfully: {output_path}")
        print(f"Total size: {len(doc_content):,} characters")

def main():
    # Get project root from command line or use current directory
    if len(sys.argv) > 1:
        project_root = sys.argv[1]
    else:
        project_root = os.getcwd()
    
    # Get output file from command line or use default
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    else:
        output_file = "khayal_healthcare_documentation.md"
    
    # Generate documentation
    generator = DocumentationGenerator(project_root, output_file)
    generator.generate_documentation()

if __name__ == "__main__":
    main()
