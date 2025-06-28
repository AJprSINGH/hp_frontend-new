interface DeepSeekResponse {
  industry: string;
  department: string;
  subDepartment: string;
  jobRole: string;
  skills: string[];
  tasks: string[];
  knowledgeAreas: string[];
  reasoning: string;
  confidence: number;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function analyzeCompanyWithDeepSeek(websiteUrl: string): Promise<DeepSeekResponse> {
  const prompt = `Analyze the company website at "${websiteUrl}" and provide structured information about the organization. 
  
Based on the website content, domain, and any available information, provide:

1. Industry classification
2. Primary department focus
3. Sub-department specialization
4. Typical job roles that exist in this company
5. Key skills required for employees
6. Common tasks and responsibilities
7. Knowledge areas and abilities needed
8. Your reasoning for these classifications
9. Confidence level (0-100)

Please respond in JSON format with the following structure:
{
  "industry": "string",
  "department": "string", 
  "subDepartment": "string",
  "jobRole": "string",
  "skills": ["skill1", "skill2", "skill3"],
  "tasks": ["task1", "task2", "task3"],
  "knowledgeAreas": ["area1", "area2", "area3"],
  "reasoning": "explanation of analysis",
  "confidence": 85
}

Be specific and practical in your analysis. Focus on the most likely industry and job roles based on the website.`;

  try {
    // Using OpenRouter as a proxy to DeepSeek API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Smart Form Handler'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenRouterResponse = await response.json();
    const content = data.choices[0]?.message?.content;
    console.log('DeepSeek API response:', content);
    if (!content) {
      throw new Error('No content received from DeepSeek API');
    }

    // Try to parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsedResponse: DeepSeekResponse = JSON.parse(jsonMatch[0]);

      // Validate response structure
      if (!parsedResponse.industry || !parsedResponse.jobRole) {
        throw new Error('Invalid response structure from DeepSeek');
      }

      return parsedResponse;
    } catch (parseError) {
      console.error('Failed to parse DeepSeek JSON response:', parseError);
      // Fallback: create structured response from text
      return createFallbackResponse(content, websiteUrl);
    }
  } catch (error) {
    console.error('DeepSeek API error:', error);
    // Return a fallback response based on URL analysis
    return createFallbackResponse('', websiteUrl);
  }
}

function createFallbackResponse(content: string, websiteUrl: string): DeepSeekResponse {
  // Simple URL-based analysis as fallback
  const domain = new URL(websiteUrl).hostname.toLowerCase();

  let industry = 'Technology';
  let jobRole = 'Software Engineer';
  let department = 'Engineering';
  let subDepartment = 'Development';

  // Basic keyword matching for common domains
  if (domain.includes('health') || domain.includes('medical') || domain.includes('clinic')) {
    industry = 'Healthcare';
    jobRole = 'Healthcare Professional';
    department = 'Medical';
    subDepartment = 'Patient Care';
  } else if (domain.includes('bank') || domain.includes('finance') || domain.includes('invest')) {
    industry = 'Finance';
    jobRole = 'Financial Analyst';
    department = 'Finance';
    subDepartment = 'Analysis';
  } else if (domain.includes('edu') || domain.includes('school') || domain.includes('university')) {
    industry = 'Education';
    jobRole = 'Teacher';
    department = 'Education';
    subDepartment = 'Instruction';
  } else if (domain.includes('shop') || domain.includes('store') || domain.includes('retail')) {
    industry = 'Retail';
    jobRole = 'Sales Manager';
    department = 'Sales';
    subDepartment = 'Management';
  } else if (domain.includes('game') || domain.includes('gaming') || domain.includes('rockstar')) {
    industry = 'Media';
    jobRole = 'Game Developer';
    department = 'Game Development';
    subDepartment = 'Game Design';
  }

  return {
    industry,
    department,
    subDepartment,
    jobRole,
    skills: ['Communication', 'Problem Solving', 'Team Collaboration'],
    tasks: ['Daily Operations', 'Customer Service', 'Project Management'],
    knowledgeAreas: ['Industry Knowledge', 'Technical Skills', 'Business Acumen'],
    reasoning: content || `Analysis based on domain keywords from ${domain}`,
    confidence: content ? 60 : 30
  };
}

export type { DeepSeekResponse };