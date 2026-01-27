# Project Plan: CI Workflows Deep Analysis & Improvement

## Overview
- **Project Description**: Comprehensive analysis and improvement of GitHub Actions CI/CD workflows for NestJS Toolbox monorepo
- **Primary Goals**: 
  1. Modernize all workflows with latest action versions
  2. Improve test coverage and quality gates
  3. Enhance security scanning and dependency management
  4. Optimize build and test performance
  5. Add missing workflows for code quality, releases, and PR validation
- **Success Criteria**: 
  - All workflows use latest stable action versions
  - Comprehensive test coverage reporting
  - Security scanning on all PRs
  - Automated dependency updates
  - Proper Lerna-based publishing workflow
  - Code quality checks (linting, formatting, type checking)

## Current State Analysis

### Existing Workflows

#### 1. `codeql-analysis.yml`
**Issues Identified:**
- Uses outdated actions (`@v1`, `@v2`)
- Only analyzes JavaScript (should include TypeScript)
- Missing TypeScript build step
- No integration with PR checks

#### 2. `nodejs.yml`
**Issues Identified:**
- Missing linting step
- No coverage reporting/upload
- Only tests changed packages (should test all on master/PRs)
- Missing type checking
- No formatting validation
- Missing test result artifacts

#### 3. `npm-publish.yml`
**Critical Issues:**
- Uses Node.js 12 (project requires >=18 <=22)
- Uses outdated actions (`@v1`, `@v2`)
- Doesn't use Lerna for publishing (uses `npm publish` directly)
- Missing proper version detection
- Missing build step before publish
- Doesn't handle monorepo publishing correctly
- Missing GitHub Packages publishing (commented but not working)

## Technical Requirements
- **Technology Stack**: GitHub Actions, Node.js 18-22, npm, Lerna, TypeScript, Jest
- **Architecture**: Monorepo with Lerna-managed packages
- **Dependencies**: All packages under `@nest-toolbox/` scope
- **Environment**: GitHub Actions runners (ubuntu-latest)

## Detailed Task Breakdown

### Phase 1: Fix Existing Workflows

- [ ] **Update `codeql-analysis.yml`**
  - [ ] Upgrade to latest CodeQL actions (`@v3`)
  - [ ] Add TypeScript language support
  - [ ] Add proper build step for TypeScript
  - [ ] Configure for monorepo structure
  - [ ] Add PR comment integration

- [ ] **Enhance `nodejs.yml`**
  - [ ] Add linting step (ESLint)
  - [ ] Add formatting check (Prettier)
  - [ ] Add TypeScript type checking
  - [ ] Add coverage reporting and upload
  - [ ] Test all packages on master/PRs (not just changed)
  - [ ] Add test result artifacts
  - [ ] Add job for build verification
  - [ ] Add matrix for npm versions (if needed)

- [ ] **Completely Rewrite `npm-publish.yml`**
  - [ ] Use Node.js 22.x (matches Volta config)
  - [ ] Upgrade all actions to latest versions
  - [ ] Implement proper Lerna publishing workflow
  - [ ] Add version detection and validation
  - [ ] Add build step before publishing
  - [ ] Handle both npm and GitHub Packages publishing
  - [ ] Add dry-run validation
  - [ ] Add changelog generation

### Phase 2: Add New Workflows

- [ ] **Create `lint-and-format.yml`**
  - [ ] Run ESLint on all packages
  - [ ] Check Prettier formatting
  - [ ] Run on PRs and pushes
  - [ ] Fail on formatting issues
  - [ ] Add auto-fix suggestions

- [ ] **Create `type-check.yml`**
  - [ ] Run TypeScript compiler in noEmit mode
  - [ ] Check all packages for type errors
  - [ ] Run on PRs and pushes
  - [ ] Fast fail on type errors

- [ ] **Create `dependency-review.yml`**
  - [ ] Review dependencies for security issues
  - [ ] Block PRs with vulnerable dependencies
  - [ ] Use GitHub's dependency review action

- [ ] **Create `release.yml`**
  - [ ] Trigger on version tags
  - [ ] Build all packages
  - [ ] Run full test suite
  - [ ] Generate changelog
  - [ ] Create GitHub release
  - [ ] Publish to npm (via npm-publish workflow)

- [ ] **Create `pr-validation.yml`**
  - [ ] Combined workflow for PR checks
  - [ ] Run lint, format, type-check, tests
  - [ ] Add PR comment with results
  - [ ] Require all checks to pass

- [ ] **Create `security-audit.yml`**
  - [ ] Run `npm audit` on all packages
  - [ ] Check for known vulnerabilities
  - [ ] Run weekly schedule
  - [ ] Create issues for critical vulnerabilities

- [ ] **Create `coverage-report.yml`**
  - [ ] Generate coverage reports
  - [ ] Upload to codecov or similar
  - [ ] Add coverage badges
  - [ ] Track coverage trends

- [ ] **Create `build-verification.yml`**
  - [ ] Verify all packages build successfully
  - [ ] Check dist outputs
  - [ ] Validate package.json files
  - [ ] Check for missing dependencies

### Phase 3: Optimization & Best Practices

- [ ] **Workflow Optimization**
  - [ ] Add caching for node_modules
  - [ ] Add caching for build artifacts
  - [ ] Parallelize independent jobs
  - [ ] Use matrix strategies efficiently
  - [ ] Add workflow concurrency limits

- [ ] **Add Workflow Status Badges**
  - [ ] Update README with workflow badges
  - [ ] Add status checks to PR template

- [ ] **Documentation**
  - [ ] Document all workflows in README
  - [ ] Add troubleshooting guide
  - [ ] Document required secrets

- [ ] **Secrets Management**
  - [ ] Document required secrets (NPM_TOKEN, etc.)
  - [ ] Add validation for missing secrets

## Implementation Strategy

### Priority Order:
1. **Critical**: Fix npm-publish.yml (broken publishing)
2. **High**: Enhance nodejs.yml (add missing checks)
3. **High**: Update codeql-analysis.yml (security)
4. **Medium**: Add new quality workflows
5. **Low**: Optimization and documentation

### Testing Strategy:
- Test workflows on feature branch first
- Verify all checks pass
- Test publishing workflow with dry-run
- Validate coverage reporting
- Test PR validation workflow

## New Workflow Specifications

### 1. Enhanced `nodejs.yml`
- **Triggers**: Push, Pull Request
- **Jobs**: 
  - Lint & Format
  - Type Check
  - Build
  - Test (all packages)
  - Coverage Upload

### 2. Rewritten `npm-publish.yml`
- **Triggers**: Release created, Manual dispatch
- **Jobs**:
  - Build & Test
  - Publish to npm (via Lerna)
  - Publish to GitHub Packages (optional)

### 3. New `pr-validation.yml`
- **Triggers**: Pull Request
- **Jobs**: Combined validation checks
- **Output**: PR comment with results

### 4. New `security-audit.yml`
- **Triggers**: Weekly schedule, Manual dispatch
- **Jobs**: Security audit, vulnerability check

### 5. New `dependency-review.yml`
- **Triggers**: Pull Request
- **Jobs**: Dependency security review

## Success Metrics
- All workflows use actions v4+
- 100% test coverage reporting
- Security scanning on all PRs
- Automated dependency updates
- Successful Lerna-based publishing
- All quality gates passing

## Risks & Mitigation
- **Risk**: Breaking existing workflows
  - **Mitigation**: Test on feature branch first
- **Risk**: Publishing workflow failures
  - **Mitigation**: Use dry-run mode, add validation steps
- **Risk**: Performance degradation
  - **Mitigation**: Use caching, parallelize jobs
