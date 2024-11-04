import os
import re

# Use the current directory
directory = '.'

# Regular expression to match the block of code
pattern = re.compile(r'<li class="dropit-trigger">.*?</li>', re.DOTALL)

for root, dirs, files in os.walk(directory):
    for filename in files:
        if filename.endswith('.htm'):
            filepath = os.path.join(root, filename)
            with open(filepath, 'r', encoding='utf-8') as file:
                content = file.read()

            # Replace the matched block with an empty string
            new_content = pattern.sub('', content)

            with open(filepath, 'w', encoding='utf-8') as file:
                file.write(new_content)

print("Code removal complete.")
