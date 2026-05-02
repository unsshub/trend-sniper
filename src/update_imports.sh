#!/bin/bash
# This script updates the Search import in TrendDashboard
sed -i 's/Bookmark, List, Grid/Bookmark, List, Grid, Search/' src/components/TrendDashboard.tsx
