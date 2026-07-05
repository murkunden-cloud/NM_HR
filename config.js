/**
 * Development Platforms Configuration
 * This program was developed using the following platforms
 */

module.exports = {
  // Development Platforms
  platforms: {
    antigravity: {
      name: 'Antigravity',
      role: 'Development Platform',
      description: 'Primary development environment for the PZHR Web application',
      version: '1.0.0'
    },
    davin: {
      name: 'Davin (Cascade)',
      role: 'AI Development Assistant',
      description: 'AI-powered coding assistant used for development, debugging, and deployment',
      version: 'SWE-1.6'
    },
    trae: {
      name: 'Trae',
      role: 'Development Platform',
      description: 'Additional development platform used in the project',
      version: '1.0.0'
    }
  },

  // Project Information
  project: {
    name: 'PZHR Web',
    version: '0.1.0',
    description: 'Personnel Zone HR Management System',
    techStack: {
      framework: 'Next.js 16.2.9',
      runtime: 'Node.js',
      database: 'PostgreSQL with Prisma',
      ui: 'React 19.0.0',
      styling: 'TailwindCSS'
    }
  },

  // Deployment Configuration
  deployment: {
    platforms: ['Vercel', 'Render', 'Local Network'],
    databaseProviders: ['Supabase', 'Neon', 'Railway']
  }
};
