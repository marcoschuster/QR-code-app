# Development Environment Setup

## Preventing Windsurf Editor Timeouts

This project has been configured to prevent the development server and IDE from closing when idle or in battery save mode.

### Changes Made:

1. **Metro Configuration** (`metro.config.js`)
   - Increased server timeout to 5 minutes (300000ms)
   - Added middleware to prevent request timeouts
   - Enabled cache reset for stability

2. **Expo Configuration** (`app.config.js`)
   - Added development client settings
   - Optimized Metro bundler configuration

3. **Package Scripts** (`package.json`)
   - Added `--timeout 300000` flag to start commands
   - Extended timeout for web development

4. **Environment Variables** (`.env`)
   - Set development timeout to 5 minutes
   - Increased Node.js memory allocation
   - Disabled unnecessary validations for battery saving

5. **TypeScript Configuration** (`tsconfig.json`)
   - Fixed module resolution for better stability

### Usage:

```bash
# Start development with extended timeout
npm start

# For web development
npm run web

# For mobile development
npm run android
# or
npm run ios
```

### Additional Recommendations:

1. **System Settings:**
   - Add your IDE to battery saver exceptions
   - Prevent system sleep during development
   - Keep your device plugged in during long development sessions

2. **IDE Settings:**
   - Increase IDE timeout settings
   - Enable "Keep process alive" options
   - Disable auto-save if causing issues

3. **Development Workflow:**
   - Use `expo start --dev-client` for better stability
   - Clear cache if issues persist: `expo start -c`
   - Monitor Metro bundler logs for timeout warnings

### Troubleshooting:

If the editor still closes:

1. Check system power settings
2. Verify IDE background process permissions
3. Try `expo start --clear` to reset cache
4. Restart with elevated permissions if needed

The configuration should now keep your development environment stable during idle periods and battery save mode.
