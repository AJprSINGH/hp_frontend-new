import { NextRequest, NextResponse } from 'next/server';
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
    const { industryId, originalAnalysis } = await req.json();

    if (!industryId) {
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      );
    }

    // Load CSV data
    const csvData = await loadCSVData();
    
    // Initialize the matcher
    const matcher = new DataMatcher(csvData);

    // Find the selected industry
    const selectedIndustry = csvData.industries.find(i => i.id === industryId);
    if (!selectedIndustry) {
      return NextResponse.json(
        { error: 'Industry not found' },
        { status: 404 }
      );
    }

    // Get all job roles for this industry
    const industryJobRoles = csvData.jobRoles.filter(jr => jr.industry_id === industryId);
    
    // Find the best matching job role for this industry based on the original job role
    let bestJobRole = industryJobRoles[0]; // Default to first job role
    let bestMatchConfidence = 0;
    
    if (originalAnalysis.jobRole && industryJobRoles.length > 0) {
      // Try to find a better match based on the original job role name
      const { jobRole, confidence } = matcher.findBestJobRole(originalAnalysis.jobRole, industryId);
      if (jobRole && confidence > 20) { // Only use if confidence is reasonable
        bestJobRole = jobRole;
        bestMatchConfidence = confidence;
      }
    }
    
    // Match data based on the selected industry and best matching job role
    const matchedData = matcher.matchCompanyData(
      selectedIndustry.industry_name,
      bestJobRole.role_name || originalAnalysis.jobRole
    );

    return NextResponse.json(matchedData);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update analysis', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}