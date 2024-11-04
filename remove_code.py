import os
import re

# Directory containing the files (update this path as needed)
directory = 'C:\\path\\to\\your\\files'

# Regular expression to match the block of code
pattern = re.compile(r'<div class="site-footer full-width">.*?</div>\s*</div>', re.DOTALL)

for filename in os.listdir(directory):
    if filename.endswith('.html'):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()

        # Replace the matched block with an empty string
        new_content = pattern.sub('', content)

        with open(filepath, 'w', encoding='utf-8') as file:
            file.write(new_content)

print("Code removal complete.")
