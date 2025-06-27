import Fuse from 'fuse.js';
import stringSimilarity from 'string-similarity';

export interface Industry {
  id: string;
  industry_name: string;
  description: string;
}

export interface JobRole {
  id: string;
  industry_id: string;
  role_name: string;
  department: string;
  sub_department: string;
  description: string;
}

export interface Skill {
  id: string;
  jobrole_id: string;
  skill_name: string;
  skill_level: string;
  importance: string;
}

export interface Task {
  id: string;
  jobrole_id: string;
  task_name: string;
  frequency: string;
  complexity: string;
}

export interface SkillMap {
  id: string;
  skill_name: string;
  knowledge_area: string;
  ability_description: string;
}

export interface MasterSkill {
  id: string;
  skill_category: string;
  skill_name: string;
  description: string;
  proficiency_level: string;
}

export interface MatchedData {
  industry: Industry;
  jobRoles: JobRole[];
  skills: Skill[];
  tasks: Task[];
  knowledgeAreas: SkillMap[];
  masterSkills: MasterSkill[];
  confidence: number;
}

export class DataMatcher {
  private industries: Industry[] = [];
  private jobRoles: JobRole[] = [];
  private skills: Skill[] = [];
  private tasks: Task[] = [];
  private skillMaps: SkillMap[] = [];
  private masterSkills: MasterSkill[] = [];

  constructor(data: {
    industries: Industry[];
    jobRoles: JobRole[];
    skills: Skill[];
    tasks: Task[];
    skillMaps: SkillMap[];
    masterSkills: MasterSkill[];
  }) {
    // Filter out any records with undefined/null names to prevent string-similarity errors
    this.industries = data.industries.filter(i => i && i.industry_name && typeof i.industry_name === 'string');
    this.jobRoles = data.jobRoles.filter(jr => jr && jr.role_name && typeof jr.role_name === 'string');
    this.skills = data.skills.filter(s => s && s.skill_name && typeof s.skill_name === 'string');
    this.tasks = data.tasks.filter(t => t && t.task_name && typeof t.task_name === 'string');
    this.skillMaps = data.skillMaps.filter(sm => sm && sm.skill_name && typeof sm.skill_name === 'string');
    this.masterSkills = data.masterSkills.filter(ms => ms && ms.skill_name && typeof ms.skill_name === 'string');
  }

  // Find best matching industry using fuzzy search
  findBestIndustry(searchTerm: string): { industry: Industry; confidence: number } {
    if (!searchTerm || typeof searchTerm !== 'string' || this.industries.length === 0) {
      return {
        industry: this.industries[0] || { id: '1', industry_name: 'Technology', description: 'Technology services' },
        confidence: 0
      };
    }

    // Clean the search term
    const cleanSearchTerm = searchTerm.trim();
    if (!cleanSearchTerm) {
      return {
        industry: this.industries[0],
        confidence: 0
      };
    }

    // Use Fuse.js for fuzzy matching first
    const fuse = new Fuse(this.industries, {
      keys: ['industry_name', 'description'],
      threshold: 0.6,
      includeScore: true
    });

    const results = fuse.search(cleanSearchTerm);

    if (results.length > 0) {
      const bestMatch = results[0];
      const confidence = Math.round((1 - (bestMatch.score || 0)) * 100);
      return { industry: bestMatch.item, confidence };
    }

    // Fallback to string similarity with proper error handling
    try {
      const industryNames = this.industries
        .map(i => i.industry_name)
        .filter(name => name && typeof name === 'string' && name.trim().length > 0);

      if (industryNames.length === 0) {
        return {
          industry: this.industries[0],
          confidence: 20
        };
      }

      const matches = stringSimilarity.findBestMatch(cleanSearchTerm, industryNames);
      const bestMatch = matches.bestMatch;

      if (bestMatch && bestMatch.rating > 0.3) {
        const industry = this.industries.find(i => i.industry_name === bestMatch.target);
        if (industry) {
          return { industry, confidence: Math.round(bestMatch.rating * 100) };
        }
      }
    } catch (error) {
      console.error('String similarity error:', error);
      // Continue to fallback
    }

    // Return first industry as fallback
    return {
      industry: this.industries[0],
      confidence: 20
    };
  }

  // Find best matching job role within an industry
  findBestJobRole(searchTerm: string, industryId: string): { jobRole: JobRole; confidence: number } {
    const industryRoles = this.jobRoles.filter(jr => jr.industry_id === industryId);

    if (!searchTerm || typeof searchTerm !== 'string' || industryRoles.length === 0) {
      return {
        jobRole: industryRoles[0] || this.jobRoles[0],
        confidence: 0
      };
    }

    // Clean the search term
    const cleanSearchTerm = searchTerm.trim();
    if (!cleanSearchTerm) {
      return {
        jobRole: industryRoles[0] || this.jobRoles[0],
        confidence: 0
      };
    }

    // Use Fuse.js for fuzzy matching first
    const fuse = new Fuse(industryRoles, {
      keys: ['role_name', 'description', 'department', 'sub_department'],
      threshold: 0.6,
      includeScore: true
    });

    const results = fuse.search(cleanSearchTerm);

    if (results.length > 0) {
      const bestMatch = results[0];
      const confidence = Math.round((1 - (bestMatch.score || 0)) * 100);
      return { jobRole: bestMatch.item, confidence };
    }

    // Fallback to string similarity with proper error handling
    try {
      const roleNames = industryRoles
        .map(jr => jr.role_name)
        .filter(name => name && typeof name === 'string' && name.trim().length > 0);

      if (roleNames.length === 0) {
        return {
          jobRole: industryRoles[0] || this.jobRoles[0],
          confidence: 15
        };
      }

      const matches = stringSimilarity.findBestMatch(cleanSearchTerm, roleNames);
      const bestMatch = matches.bestMatch;

      if (bestMatch && bestMatch.rating > 0.2) {
        const jobRole = industryRoles.find(jr => jr.role_name === bestMatch.target);
        if (jobRole) {
          return { jobRole, confidence: Math.round(bestMatch.rating * 100) };
        }
      }
    } catch (error) {
      console.error('String similarity error for job roles:', error);
      // Continue to fallback
    }

    return {
      jobRole: industryRoles[0] || this.jobRoles[0],
      confidence: 15
    };
  }

  // Get all related data for a matched job role
  getRelatedData(jobRoleId: string): {
    skills: Skill[];
    tasks: Task[];
    knowledgeAreas: SkillMap[];
    masterSkills: MasterSkill[];
  } {
    const skills = this.skills.filter(s => s.jobrole_id === jobRoleId);
    const tasks = this.tasks.filter(t => t.jobrole_id === jobRoleId);

    // Get knowledge areas for the skills
    const skillNames = skills.map(s => s.skill_name).filter(name => name && typeof name === 'string');
    const knowledgeAreas = this.skillMaps.filter(sm =>
      skillNames.some(sn => {
        try {
          return sn.toLowerCase().includes(sm.skill_name.toLowerCase()) ||
            sm.skill_name.toLowerCase().includes(sn.toLowerCase());
        } catch (error) {
          return false;
        }
      })
    );

    // Get master skills that match
    const masterSkills = this.masterSkills.filter(ms =>
      skillNames.some(sn => {
        try {
          return sn.toLowerCase().includes(ms.skill_name.toLowerCase()) ||
            ms.skill_name.toLowerCase().includes(sn.toLowerCase());
        } catch (error) {
          return false;
        }
      })
    );

    return {
      skills,
      tasks,
      knowledgeAreas,
      masterSkills
    };
  }

  // Main matching function
  matchCompanyData(
    industrySearch: string,
    jobRoleSearch: string,
    skillsSearch: string[] = []
  ): MatchedData {
    // Find best industry
    const { industry, confidence: industryConfidence } = this.findBestIndustry(industrySearch);

    // Find best job role within that industry
    const { jobRole, confidence: jobRoleConfidence } = this.findBestJobRole(jobRoleSearch, industry.id);

    // Get all job roles for this industry
    const industryJobRoles = this.jobRoles.filter(jr => jr.industry_id === industry.id);

    // Get related data
    const relatedData = this.getRelatedData(jobRole.id);

    // Calculate overall confidence
    const overallConfidence = Math.round((industryConfidence + jobRoleConfidence) / 2);

    return {
      industry,
      jobRoles: industryJobRoles,
      skills: relatedData.skills,
      tasks: relatedData.tasks,
      knowledgeAreas: relatedData.knowledgeAreas,
      masterSkills: relatedData.masterSkills,
      confidence: overallConfidence
    };
  }
}

// Utility function to parse CSV data with better error handling
export function parseCSVData(csvContent: string): any[] {
  if (!csvContent || typeof csvContent !== 'string') {
    return [];
  }

  const lines = csvContent.trim().split('\n').filter(line => line && line.trim());;
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = line.split(',').map(v => v.trim());
    const row: any = {};

    headers.forEach((header, index) => {
      // Ensure we don't have undefined values
      row[header] = typeof values[index] !== 'undefined' ? values[index] : '';
    });

    // Only add rows that have at least some data
    const hasData = Object.values(row).some(value => value && value !== '');
    if (hasData) {
      data.push(row);
    }
  }

  return data;
}