import os
import re

# Use the current directory
directory = '.'

# Regular expression to match the block of code with a flexible src attribute
pattern = re.compile(
    r'<div class="nav-dropdown">\s*<a href="https://online\.pjfperformance\.net/users/a_walker90155/">\s*<img width="30" class="round-image" src="[^"]*">\s*</a>\s*<i class="fa fa-chevron-down"></i>\s*</div>', 
    re.DOTALL
)

# Traverse the directory and its subdirectories
for root, dirs, files in os.walk(directory):
    for filename in files:
        if filename.endswith('.htm'):  # Only process HTML files
            filepath = os.path.join(root, filename)
            with open(filepath, 'r', encoding='utf-8') as file:
                content = file.read()

            # Replace all matched blocks with an empty string
            new_content = pattern.sub('', content)

            # Write the updated content back to the file only if there were changes
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as file:
                    file.write(new_content)

print("Code removal complete.")
