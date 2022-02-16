yarn reskindex
result=$(yarn test --coverage --changedSince=origin/develop --coverage-reporters="json" --coverage-reporters="text-summary")
echo "$result"