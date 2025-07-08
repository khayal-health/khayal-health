# Variables
BACKEND_DIR = KhayalHealthcare-Backend
FRONTEND_DIR = KhayalHealthcare-Frontend
PYTHON = python
PIP = pip
NPM = npm

# OS Detection
ifeq ($(OS),Windows_NT)
    # Windows specific settings
    DETECTED_OS := Windows
    RM_RF = rmdir /s /q
    RM_F = del /q /f
    MKDIR = mkdir
    PATH_SEP = \\
    NULL_REDIRECT = >nul 2>&1
    VENV_ACTIVATE = venv$(PATH_SEP)Scripts$(PATH_SEP)activate
    PYTHON_VENV = venv$(PATH_SEP)Scripts$(PATH_SEP)python
    PIP_VENV = venv$(PATH_SEP)Scripts$(PATH_SEP)pip
    KILL_UVICORN = taskkill /f /im python.exe $(NULL_REDIRECT) || echo.
    KILL_VITE = taskkill /f /im node.exe $(NULL_REDIRECT) || echo.
    FIND_PYCACHE = for /d /r . %%d in (__pycache__) do @if exist "%%d" $(RM_RF) "%%d" $(NULL_REDIRECT)
    FIND_PYC = for /r . %%f in (*.pyc) do @if exist "%%f" $(RM_F) "%%f" $(NULL_REDIRECT)
    FIND_PYO = for /r . %%f in (*.pyo) do @if exist "%%f" $(RM_F) "%%f" $(NULL_REDIRECT)
    CHECK_VENV = if exist "$(BACKEND_DIR)$(PATH_SEP)venv" echo Virtual environment exists || echo Virtual environment not found
    # Colors (limited support on Windows CMD)
    GREEN = 
    YELLOW = 
    NC = 
else
    UNAME_S := $(shell uname -s)
    ifeq ($(UNAME_S),Linux)
        # Linux specific settings
        DETECTED_OS := Linux
    endif
    ifeq ($(UNAME_S),Darwin)
        # macOS specific settings
        DETECTED_OS := macOS
    endif
    
    # Unix-like systems (Linux/macOS) settings
    RM_RF = rm -rf
    RM_F = rm -f
    MKDIR = mkdir -p
    PATH_SEP = /
    NULL_REDIRECT = >/dev/null 2>&1
    VENV_ACTIVATE = venv$(PATH_SEP)bin$(PATH_SEP)activate
    PYTHON_VENV = venv$(PATH_SEP)bin$(PATH_SEP)python
    PIP_VENV = venv$(PATH_SEP)bin$(PATH_SEP)pip
    KILL_UVICORN = pkill -f "uvicorn" || true
    KILL_VITE = pkill -f "vite" || true
    FIND_PYCACHE = find . -type d -name "__pycache__" -exec $(RM_RF) {} + $(NULL_REDIRECT) || true
    FIND_PYC = find . -type f -name "*.pyc" -delete $(NULL_REDIRECT) || true
    FIND_PYO = find . -type f -name "*.pyo" -delete $(NULL_REDIRECT) || true
    CHECK_VENV = [ -d "$(BACKEND_DIR)$(PATH_SEP)venv" ] && echo "Virtual environment exists" || echo "Virtual environment not found"
    # Colors for Unix-like systems
    GREEN = \033[0;32m
    YELLOW = \033[0;33m
    NC = \033[0m
endif

# Default target
.DEFAULT_GOAL := help

# Help command
help:
	@echo "$(GREEN)KhayalHealthcare Project Commands ($(DETECTED_OS)):$(NC)"
	@echo "  $(YELLOW)make init$(NC)              - Run both frontend and backend"
	@echo "  $(YELLOW)make backend$(NC)           - Run backend only"
	@echo "  $(YELLOW)make frontend$(NC)          - Run frontend only"
	@echo "  $(YELLOW)make install$(NC)           - Install all dependencies"
	@echo "  $(YELLOW)make install-backend$(NC)   - Install backend dependencies"
	@echo "  $(YELLOW)make install-frontend$(NC)  - Install frontend dependencies"
	@echo "  $(YELLOW)make clean$(NC)             - Clean cache files"
	@echo "  $(YELLOW)make clean-python$(NC)      - Clean Python temporary files"
	@echo "  $(YELLOW)make clean-all$(NC)         - Clean everything including node_modules"
	@echo "  $(YELLOW)make venv$(NC)              - Create Python virtual environment"
	@echo "  $(YELLOW)make venv-install$(NC)      - Install backend deps in virtual environment"
	@echo "  $(YELLOW)make backend-venv$(NC)      - Run backend with virtual environment"
	@echo "  $(YELLOW)make stop$(NC)              - Stop all running services"
	@echo "  $(YELLOW)make status$(NC)            - Check service status"
	@echo "  $(YELLOW)make dev$(NC)               - Development setup (install and run)"
	@echo "  $(YELLOW)make test$(NC)              - Run tests"

# Install all dependencies
install: install-backend install-frontend
	@echo "$(GREEN)All dependencies installed!$(NC)"

# Install backend dependencies
install-backend:
	@echo "$(YELLOW)Installing backend dependencies...$(NC)"
ifeq ($(OS),Windows_NT)
	cd $(BACKEND_DIR) && $(PIP) install -r requirements.txt
else
	cd $(BACKEND_DIR) && $(PIP) install -r requirements.txt
endif

# Install frontend dependencies
install-frontend:
	@echo "$(YELLOW)Installing frontend dependencies...$(NC)"
ifeq ($(OS),Windows_NT)
	cd $(FRONTEND_DIR) && $(NPM) install
else
	cd $(FRONTEND_DIR) && $(NPM) install
endif

# Run both frontend and backend
init:
	@echo "$(GREEN)Starting both frontend and backend...$(NC)"
ifeq ($(OS),Windows_NT)
	@echo "$(YELLOW)Note: On Windows, run 'make backend' and 'make frontend' in separate terminals$(NC)"
	@echo "$(YELLOW)Starting backend...$(NC)"
	@start cmd /k "cd $(BACKEND_DIR) && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
	@echo "$(YELLOW)Starting frontend...$(NC)"
	@start cmd /k "cd $(FRONTEND_DIR) && $(NPM) run dev"
else
	@$(MAKE) -j 2 backend frontend
endif

# Run backend
backend:
	@echo "$(YELLOW)Starting backend server...$(NC)"
ifeq ($(OS),Windows_NT)
	cd $(BACKEND_DIR) && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
else
	cd $(BACKEND_DIR) && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
endif

# Run frontend
frontend:
	@echo "$(YELLOW)Starting frontend server...$(NC)"
ifeq ($(OS),Windows_NT)
	cd $(FRONTEND_DIR) && $(NPM) run dev
else
	cd $(FRONTEND_DIR) && $(NPM) run dev
endif

# Clean cache files
clean:
	@echo "$(YELLOW)Cleaning cache files...$(NC)"
ifeq ($(OS),Windows_NT)
	@$(FIND_PYCACHE)
	@$(FIND_PYC)
	@if exist "$(FRONTEND_DIR)$(PATH_SEP)node_modules$(PATH_SEP).cache" $(RM_RF) "$(FRONTEND_DIR)$(PATH_SEP)node_modules$(PATH_SEP).cache" $(NULL_REDIRECT)
else
	@$(FIND_PYCACHE)
	@$(FIND_PYC)
	@cd $(FRONTEND_DIR) && $(RM_RF) node_modules/.cache $(NULL_REDIRECT)
endif
	@echo "$(GREEN)Cache files cleaned!$(NC)"

# Clean Python temporary files comprehensively
clean-python:
	@echo "$(YELLOW)Cleaning Python temporary files...$(NC)"
ifeq ($(OS),Windows_NT)
	@$(FIND_PYCACHE)
	@$(FIND_PYC)
	@$(FIND_PYO)
	@for /d /r . %%d in (*.egg-info) do @if exist "%%d" $(RM_RF) "%%d" $(NULL_REDIRECT)
	@for /d /r . %%d in (.pytest_cache) do @if exist "%%d" $(RM_RF) "%%d" $(NULL_REDIRECT)
	@for /d /r . %%d in (.tox) do @if exist "%%d" $(RM_RF) "%%d" $(NULL_REDIRECT)
	@for /d /r . %%d in (build) do @if exist "%%d" $(RM_RF) "%%d" $(NULL_REDIRECT)
	@for /d /r . %%d in (dist) do @if exist "%%d" $(RM_RF) "%%d" $(NULL_REDIRECT)
	@for /r . %%f in (.coverage) do @if exist "%%f" $(RM_F) "%%f" $(NULL_REDIRECT)
	@for /d /r . %%d in (htmlcov) do @if exist "%%d" $(RM_RF) "%%d" $(NULL_REDIRECT)
else
	@$(FIND_PYCACHE)
	@$(FIND_PYC)
	@$(FIND_PYO)
	@find . -type d -name "*.egg-info" -exec $(RM_RF) {} + $(NULL_REDIRECT) || true
	@find . -type d -name ".pytest_cache" -exec $(RM_RF) {} + $(NULL_REDIRECT) || true
	@find . -type d -name ".tox" -exec $(RM_RF) {} + $(NULL_REDIRECT) || true
	@find . -type d -name "build" -exec $(RM_RF) {} + $(NULL_REDIRECT) || true
	@find . -type d -name "dist" -exec $(RM_RF) {} + $(NULL_REDIRECT) || true
	@find . -type f -name ".coverage" -delete $(NULL_REDIRECT) || true
	@find . -type d -name "htmlcov" -exec $(RM_RF) {} + $(NULL_REDIRECT) || true
endif
	@echo "$(GREEN)Python temporary files cleaned!$(NC)"

# Clean everything including node_modules
clean-all: clean-python
	@echo "$(YELLOW)Cleaning everything including node_modules...$(NC)"
ifeq ($(OS),Windows_NT)
	@if exist "$(FRONTEND_DIR)$(PATH_SEP)node_modules" $(RM_RF) "$(FRONTEND_DIR)$(PATH_SEP)node_modules" $(NULL_REDIRECT)
	@if exist "$(BACKEND_DIR)$(PATH_SEP)venv" $(RM_RF) "$(BACKEND_DIR)$(PATH_SEP)venv" $(NULL_REDIRECT)
else
	@$(RM_RF) $(FRONTEND_DIR)/node_modules $(NULL_REDIRECT)
	@$(RM_RF) $(BACKEND_DIR)/venv $(NULL_REDIRECT)
endif
	@echo "$(GREEN)Everything cleaned!$(NC)"

# Create virtual environment for backend
venv:
	@echo "$(YELLOW)Creating Python virtual environment...$(NC)"
ifeq ($(OS),Windows_NT)
	cd $(BACKEND_DIR) && $(PYTHON) -m venv venv
	@echo "$(GREEN)Virtual environment created! Activate with: $(BACKEND_DIR)$(PATH_SEP)$(VENV_ACTIVATE)$(NC)"
else
	cd $(BACKEND_DIR) && $(PYTHON) -m venv venv
	@echo "$(GREEN)Virtual environment created! Activate with: source $(BACKEND_DIR)/$(VENV_ACTIVATE)$(NC)"
endif

# Install backend dependencies in virtual environment
venv-install: venv
	@echo "$(YELLOW)Installing backend dependencies in virtual environment...$(NC)"
ifeq ($(OS),Windows_NT)
	cd $(BACKEND_DIR) && $(PIP_VENV) install -r requirements.txt
else
	cd $(BACKEND_DIR) && source $(VENV_ACTIVATE) && pip install -r requirements.txt
endif

# Run backend with virtual environment
backend-venv:
	@echo "$(YELLOW)Starting backend server with virtual environment...$(NC)"
ifeq ($(OS),Windows_NT)
	cd $(BACKEND_DIR) && $(VENV_ACTIVATE) && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
else
	cd $(BACKEND_DIR) && source $(VENV_ACTIVATE) && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
endif

# Stop all services
stop:
	@echo "$(YELLOW)Stopping all services...$(NC)"
	@$(KILL_UVICORN)
	@$(KILL_VITE)
	@echo "$(GREEN)All services stopped!$(NC)"

# Check if services are running
status:
	@echo "$(YELLOW)Checking service status on $(DETECTED_OS)...$(NC)"
ifeq ($(OS),Windows_NT)
	@echo "Checking for Python/uvicorn processes:"
	@tasklist /fi "imagename eq python.exe" $(NULL_REDIRECT) && echo "Python processes found" || echo "No Python processes"
	@echo "Checking for Node/npm processes:"
	@tasklist /fi "imagename eq node.exe" $(NULL_REDIRECT) && echo "Node processes found" || echo "No Node processes"
else
	@echo "Checking for uvicorn processes:"
	@ps aux | grep -E "uvicorn" | grep -v grep || echo "No uvicorn processes running"
	@echo "Checking for vite processes:"
	@ps aux | grep -E "vite" | grep -v grep || echo "No vite processes running"
endif

# Check virtual environment
check-venv:
	@echo "$(YELLOW)Checking virtual environment...$(NC)"
	@$(CHECK_VENV)

# Run tests
test:
	@echo "$(YELLOW)Running tests...$(NC)"
ifeq ($(OS),Windows_NT)
	cd $(BACKEND_DIR) && $(PYTHON) -m pytest || echo "No tests found or pytest not installed"
else
	cd $(BACKEND_DIR) && $(PYTHON) -m pytest || echo "No tests found or pytest not installed"
endif

# Development setup (install and run)
dev: install init

# Show system information
info:
	@echo "$(GREEN)System Information:$(NC)"
	@echo "Detected OS: $(DETECTED_OS)"
	@echo "Python: $(PYTHON)"
	@echo "PIP: $(PIP)"
	@echo "NPM: $(NPM)"
	@echo "Backend Directory: $(BACKEND_DIR)"
	@echo "Frontend Directory: $(FRONTEND_DIR)"

.PHONY: help init backend frontend install install-backend install-frontend clean clean-python clean-all stop venv venv-install backend-venv status check-venv test dev info
