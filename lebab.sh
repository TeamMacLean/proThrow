#!/usr/bin/env bash
for file in $(find ./src -name "*.js"); do
if [[ $file != *"public/"* ]] && [[ $file != *"node_modules/"* ]] && [[ $file != *"gulpfile.js" ]] && [[ $file != *"config"* ]]; then
    lebab $file -o $file
fi
done
