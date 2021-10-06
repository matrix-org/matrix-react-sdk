#!/bin/bash

set -x

deforg="$1"
defrepo="$2"
defbranch="$3"

[ -z "$defbranch" ] && defbranch="develop"

rm -r "$defrepo" || true

# A function that clones a branch of a repo based on the org, repo and branch
clone() {
    org=$1
    repo=$2
    branch=$3
    if [ -n "$branch" ]
    then
        echo "Trying to use $org/$repo#$branch"
        git clone git://github.com/$org/$repo.git $repo --branch "$branch" --depth 1 && exit 0
    fi
}

# A function that gets info about a PR from the GitHub API based on its number
getPRInfo() {
    number=$1
    if [ -n "$number" ]; then
        echo "Getting info about a PR with number $number"

        apiEndpoint="https://api.github.com/repos/matrix-org/matrix-react-sdk/pulls/"
        apiEndpoint+=$number

        head=$(curl $apiEndpoint | jq -r '.head.label')
    fi
}

# Some CIs don't give us enough info, so we just get the PR number and ask the
# GH API for more info - "fork:branch". Some give us this directly.
if [ -n "$BUILDKITE_BRANCH" ]; then
    # BuildKite
    head=$BUILDKITE_BRANCH
elif [ -n "$PR_NUMBER" ]; then
    # GitHub
    getPRInfo $PR_NUMBER
elif [ -n "$REVIEW_ID" ]; then
    # Netlify
    getPRInfo $REVIEW_ID
fi

# $head will always be in the format "fork:branch", so we split it by ":" into
# an array. The first element will then be the fork and the second the branch.
# Based on that we clone
BRANCH_ARRAY=(${head//:/ })
clone ${BRANCH_ARRAY[0]} $defrepo ${BRANCH_ARRAY[1]}

# Try the target branch of the push or PR.
if [ -n $GITHUB_BASE_REF ]; then
    clone $deforg $defrepo $GITHUB_BASE_REF
elif [ -n $BUILDKITE_PULL_REQUEST_BASE_BRANCH ]; then
    clone $deforg $defrepo $BUILDKITE_PULL_REQUEST_BASE_BRANCH
fi

# Try HEAD which is the branch name in Netlify (not BRANCH which is pull/xxxx/head for PR builds)
clone $deforg $defrepo $HEAD
# Use the default branch as the last resort.
clone $deforg $defrepo $defbranch
