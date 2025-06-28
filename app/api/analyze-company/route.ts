import { NextRequest, NextResponse } from 'next/server';
import { analyzeCompanyWithDeepSeek } from '@/lib/deepseek';
import { DataMatcher, parseCSVData } from '@/lib/matcher';
import { promises as fs } from 'fs';
import path from 'path';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Cache for CSV data to avoid reading files repeatedly
let csvDataCache: {
  industries: any[];
  jobRoles: any[];
  skills: any[];
  tasks: any[];
  skillMaps: any[];
  masterSkills: any[];
} | null = null;

async function loadCSVData() {
  if (csvDataCache) {
    return csvDataCache;
  }

  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');

    const [
      industriesCSV,
      jobRolesCSV,
      skillsCSV,
      tasksCSV,
      skillMapsCSV,
      masterSkillsCSV
    ] = await Promise.all([
      fs.readFile(path.join(dataDir, 's_industries.csv'), 'utf-8'),
      fs.readFile(path.join(dataDir, 's_jobrole.csv'), 'utf-8'),
      fs.readFile(path.join(dataDir, 's_jobrole_skills.csv'), 'utf-8'),
      fs.readFile(path.join(dataDir, 's_jobrole_task.csv'), 'utf-8'),
      fs.readFile(path.join(dataDir, 's_skill_map_k_a.csv'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'master_skills.csv'), 'utf-8')
    ]);

    csvDataCache = {
      industries: parseCSVData(industriesCSV),
      jobRoles: parseCSVData(jobRolesCSV),
      skills: parseCSVData(skillsCSV),
      tasks: parseCSVData(tasksCSV),
      skillMaps: parseCSVData(skillMapsCSV),
      masterSkills: parseCSVData(masterSkillsCSV)
    };

    return csvDataCache;
  } catch (error) {
    console.error('Error loading CSV data:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { websiteUrl } = await req.json();

    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'Website URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(websiteUrl);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Load CSV data
    const csvData = await loadCSVData();

    // Initialize the matcher
    const matcher = new DataMatcher(csvData);

    let deepSeekResponse;
    let matchedData;

    try {
      // Analyze company with DeepSeek
      deepSeekResponse = await analyzeCompanyWithDeepSeek(websiteUrl);

      // Match the DeepSeek response with local database
      let industryToMatch = deepSeekResponse.industry;

      // Map specific industries to our database categories
      if (industryToMatch.toLowerCase().includes('game') ||
        industryToMatch.toLowerCase().includes('gaming') ||
        industryToMatch.toLowerCase().includes('video')) {
        industryToMatch = 'Media';
      }

      matchedData = matcher.matchCompanyData(
        industryToMatch,
        deepSeekResponse.jobRole,
        deepSeekResponse.skills
      );
    } catch (deepSeekError) {
      console.error('DeepSeek analysis failed:', deepSeekError);

      // Fallback matching with basic URL analysis
      const domain = new URL(websiteUrl).hostname.toLowerCase();
      let fallbackIndustry = 'Technology';
      let fallbackJobRole = 'Software Engineer';

      if (domain.includes('health') || domain.includes('medical')) {
        fallbackIndustry = 'Healthcare';
        fallbackJobRole = 'Healthcare Professional';
      } else if (domain.includes('bank') || domain.includes('finance')) {
        fallbackIndustry = 'Finance';
        fallbackJobRole = 'Financial Analyst';
      } else if (domain.includes('edu') || domain.includes('school')) {
        fallbackIndustry = 'Education';
        fallbackJobRole = 'Teacher';
      } else if (domain.includes('game') || domain.includes('gaming') || domain.includes('rockstar')) {
        fallbackIndustry = 'Media';
        fallbackJobRole = 'Game Developer';
      }

      matchedData = matcher.matchCompanyData(fallbackIndustry, fallbackJobRole);

      deepSeekResponse = {
        industry: fallbackIndustry,
        department: matchedData.jobRoles[0]?.department || 'General',
        subDepartment: matchedData.jobRoles[0]?.sub_department || 'Operations',
        jobRole: fallbackJobRole,
        skills: matchedData.skills.slice(0, 3).map(s => s.skill_name),
        tasks: matchedData.tasks.slice(0, 3).map(t => t.task_name),
        knowledgeAreas: matchedData.knowledgeAreas.slice(0, 3).map(ka => ka.knowledge_area),
        reasoning: 'Fallback analysis based on domain keywords',
        confidence: 30
      };
    }

    // Prepare response data
    const responseData = {
      analysis: deepSeekResponse,
      matches: {
        industry: matchedData.industry,
        jobRoles: matchedData.jobRoles,
        primaryJobRole: matchedData.jobRoles[0],
        skills: matchedData.skills,
        tasks: matchedData.tasks,
        knowledgeAreas: matchedData.knowledgeAreas,
        masterSkills: matchedData.masterSkills
      },
      confidence: Math.min(deepSeekResponse.confidence, matchedData.confidence),
      websiteUrl
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze company',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}