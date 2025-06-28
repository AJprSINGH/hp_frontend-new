'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Globe, Building, Users, Briefcase, Lightbulb, CheckSquare, Brain, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const urlSchema = z.object({
  websiteUrl: z.string().url('Please enter a valid website URL'),
});

type FormData = z.infer<typeof urlSchema>;

interface AnalysisResult {
  analysis: {
    industry: string;
    department: string;
    subDepartment: string;
    jobRole: string;
    skills: string[];
    tasks: string[];
    knowledgeAreas: string[];
    reasoning: string;
    confidence: number;
  };
  matches: {
    industry: {
      id: string;
      industry_name: string;
      description: string;
    };
    jobRoles: Array<{
      id: string;
      role_name: string;
      department: string;
      sub_department: string;
      description: string;
    }>;
    primaryJobRole: {
      id: string;
      role_name: string;
      department: string;
      sub_department: string;
      description: string;
    };
    skills: Array<{
      id: string;
      skill_name: string;
      skill_level: string;
      importance: string;
    }>;
    tasks: Array<{
      id: string;
      task_name: string;
      frequency: string;
      complexity: string;
    }>;
    knowledgeAreas: Array<{
      id: string;
      knowledge_area: string;
      ability_description: string;
    }>;
    masterSkills: Array<{
      id: string;
      skill_name: string;
      skill_category: string;
      description: string;
    }>;
  };
  confidence: number;
  websiteUrl: string;
}

interface IndustryOption {
  id: string;
  industry_name: string;
  description: string;
  similarity: number;
}

export function CompanyAnalysisForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topIndustries, setTopIndustries] = useState<IndustryOption[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [isUpdatingIndustry, setIsUpdatingIndustry] = useState(false);
  const [originalResult, setOriginalResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzerLocked, setIsAnalyzerLocked] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<FormData>({
    resolver: zodResolver(urlSchema),
  });

  const websiteUrl = watch('websiteUrl');

  // Check if analyzer is locked when component mounts
  useEffect(() => {
    const lockedState = localStorage.getItem('analyzerLocked');
    const savedAnalysis = localStorage.getItem('savedAnalysis');

    if (lockedState === 'true') {
      setIsAnalyzerLocked(true);

      if (savedAnalysis) {
        setResult(JSON.parse(savedAnalysis));
      }
    }
  }, []);

  // Function to add job roles to the library
  const addJobRolesToLibrary = async (jobRoles: any[]) => {
    if (!jobRoles || jobRoles.length === 0) return;

    const userData = localStorage.getItem('userData');
    if (!userData) return;

    const { APP_URL, token, org_type, sub_institute_id, user_id, user_profile_name } = JSON.parse(userData);

    // Add each job role to the library
    for (const role of jobRoles) {
      const payload = {
        jobrole: role.role_name,
        description: role.description,
        type: "API",
        method_field: 'POST',
        token: token,
        sub_institute_id: sub_institute_id,
        org_type: org_type,
        user_profile_name: user_profile_name,
        user_id: user_id,
        formType: 'user',
      };

      try {
        await fetch(`${APP_URL}/jobrole_library`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error("Error adding job role:", error);
      }
    }
  };

  // Function to save analysis and lock the analyzer
  const saveAnalysis = async () => {
    if (!result) return;

    try {
      // Save the analysis state to localStorage to persist across the session
      localStorage.setItem('savedAnalysis', JSON.stringify(result));
      localStorage.setItem('analyzerLocked', 'true');

      // Add job roles to the Job Role Library
      await addJobRolesToLibrary(result.matches.jobRoles);

      // Lock the analyzer
      setIsAnalyzerLocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save analysis');
    }
  };

  const onSubmit = async (data: FormData) => {
    // If analyzer is locked, show message and return
    if (isAnalyzerLocked) {
      setError('Website analyzer is locked. You can only analyze one company per login session.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setTopIndustries([]);
    setSelectedIndustry(null);
    setOriginalResult(null);

    try {
      const response = await fetch('/api/analyze-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze company');
      }

      const analysisResult: AnalysisResult = await response.json();
      setResult(analysisResult);
      setOriginalResult(analysisResult);

      // Fetch all industries to find top matches
      const industriesResponse = await fetch('/api/industries');
      if (industriesResponse.ok) {
        const industries = await industriesResponse.json();
        const matchedIndustries = findTopMatchingIndustries(
          analysisResult.analysis.industry,
          industries,
          4
        );
        setTopIndustries(matchedIndustries);

        // Set the detected industry as selected by default
        const detectedIndustry = matchedIndustries.find(
          i => i.industry_name.toLowerCase() === analysisResult.analysis.industry.toLowerCase()
        );
        if (detectedIndustry) {
          setSelectedIndustry(detectedIndustry.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to find top matching industries based on string similarity
  const findTopMatchingIndustries = (detectedIndustry: string, allIndustries: any[], count: number): IndustryOption[] => {
    // Simple string similarity function
    const calculateSimilarity = (a: string, b: string): number => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();

      // Exact match
      if (aLower === bLower) return 1;

      // Contains match
      if (aLower.includes(bLower) || bLower.includes(aLower)) {
        return 0.8;
      }

      // Word match
      const aWords = aLower.split(/\s+/);
      const bWords = bLower.split(/\s+/);

      let matchCount = 0;
      for (const aWord of aWords) {
        if (bWords.some(bWord => bWord === aWord || bWord.includes(aWord) || aWord.includes(bWord))) {
          matchCount++;
        }
      }

      return matchCount / Math.max(aWords.length, bWords.length);
    };

    // Calculate similarity for each industry
    const industriesWithSimilarity = allIndustries.map(industry => ({
      ...industry,
      similarity: calculateSimilarity(detectedIndustry, industry.industry_name)
    }));

    // Sort by similarity and take top N
    return industriesWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, count);
  };

  // Function to update analysis based on selected industry
  const updateAnalysisWithIndustry = async (industryId: string) => {
    if (!originalResult) return;

    setIsUpdatingIndustry(true);

    try {
      const response = await fetch('/api/update-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industryId,
          originalAnalysis: originalResult.analysis
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update analysis');
      }

      const updatedData = await response.json();

      // Update the result with the new industry data
      setResult({
        ...originalResult,
        analysis: {
          ...originalResult.analysis,
          industry: updatedData.industry.industry_name
        },
        matches: {
          ...originalResult.matches,
          industry: updatedData.industry,
          jobRoles: updatedData.jobRoles,
          primaryJobRole: updatedData.jobRoles[0] || originalResult.matches.primaryJobRole,
          skills: updatedData.skills,
          tasks: updatedData.tasks,
          knowledgeAreas: updatedData.knowledgeAreas,
          masterSkills: updatedData.masterSkills
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update industry');
    } finally {
      setIsUpdatingIndustry(false);
    }
  };

  // Handle industry selection change
  const handleIndustryChange = (industryId: string) => {
    setSelectedIndustry(industryId);
    updateAnalysisWithIndustry(industryId);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High Confidence';
    if (confidence >= 60) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* URL Input Form */}
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Globe className="h-6 w-6 text-blue-600" />
            Smart Company Analysis
          </CardTitle>
          <CardDescription>
            Enter a company website URL to get AI-powered insights and auto-fill form data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Company Website URL</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="websiteUrl"
                  placeholder="https://example.com"
                  className="pl-10"
                  {...register('websiteUrl')}
                  disabled={isAnalyzerLocked}
                />
              </div>
              {errors.websiteUrl && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.websiteUrl.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !websiteUrl || isAnalyzerLocked}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Company...
                </>
              ) : (
                'Analyze Company'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Analyzing Company...</p>
                <p className="text-muted-foreground">This may take a few moments</p>
              </div>
              <Progress value={undefined} className="w-full max-w-md mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6">
            <div className="text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto" />
              <p className="text-red-800 font-medium">Analysis Failed</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Industry Selection */}
      {result && topIndustries.length > 0 && (
        <Card className="shadow-lg border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Select Best Matching Industry
            </CardTitle>
            <CardDescription>
              Choose the industry that best matches this company
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isUpdatingIndustry && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                <span>Updating analysis...</span>
              </div>
            )}

            {!isUpdatingIndustry && (
              <RadioGroup
                value={selectedIndustry || ''}
                onValueChange={handleIndustryChange}
                className="space-y-3"
              >
                {topIndustries.map((industry) => (
                  <div key={industry.id} className="flex items-start space-x-2">
                    <RadioGroupItem value={industry.id} id={`industry-${industry.id}`} className="mt-1" />
                    <div className="grid gap-1.5 w-full">
                      <Label htmlFor={`industry-${industry.id}`} className="font-medium">
                        {industry.industry_name}
                        {industry.similarity >= 0.8 && (
                          <Badge className="ml-2 bg-green-500">High Match</Badge>
                        )}
                      </Label>
                      <p className="text-sm text-muted-foreground">{industry.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Analysis Overview */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  Analysis Results
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded-full', getConfidenceColor(result.confidence))} />
                  <span className="text-sm font-medium">{getConfidenceLabel(result.confidence)}</span>
                  <Badge variant="outline">{result.confidence}%</Badge>
                </div>
              </div>
              <CardDescription>
                Analysis for: <span className="font-medium">{result.websiteUrl}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Industry</Label>
                  <p className="font-medium">{result.analysis.industry}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Department</Label>
                  <p className="font-medium">{result.analysis.department}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Sub-Department</Label>
                  <p className="font-medium">{result.analysis.subDepartment}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Primary Job Role</Label>
                  <p className="font-medium">{result.analysis.jobRole}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results Tabs */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Detailed Analysis</CardTitle>
              <CardDescription>
                Comprehensive breakdown of matched data and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="roles">Job Roles</TabsTrigger>
                  <TabsTrigger value="skills">Skills</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
                  <TabsTrigger value="reasoning">AI Analysis</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Industry Match
                      </h4>
                      <Card>
                        <CardContent className="p-4">
                          <h5 className="font-medium">{result.matches.industry.industry_name}</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            {result.matches.industry.description}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Primary Job Role
                      </h4>
                      <Card>
                        <CardContent className="p-4">
                          <h5 className="font-medium">{result.matches.primaryJobRole?.role_name || 'Role not specified'}</h5>
                          <p className="text-xs text-muted-foreground">
                            {result.matches.primaryJobRole?.department || ''} • {result.matches.primaryJobRole?.sub_department || ''}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {result.matches.primaryJobRole?.description || ''}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="roles" className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4" />
                    <h4 className="font-semibold">Available Job Roles ({result.matches.jobRoles.length})</h4>
                  </div>
                  <ScrollArea className="h-80">
                    <div className="space-y-3">
                      {result.matches.jobRoles.map((role) => (
                        <Card key={role.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h5 className="font-medium">{role.role_name}</h5>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {role.department}
                                </Badge>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                  {role.sub_department}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{role.description}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="skills" className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="h-4 w-4" />
                    <h4 className="font-semibold">Required Skills ({result.matches.skills.length})</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.matches.skills.map((skill) => (
                      <Card key={skill.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <h5 className="font-medium">{skill.skill_name}</h5>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={skill.skill_level === 'Expert' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {skill.skill_level}
                              </Badge>
                              <Badge
                                variant={skill.importance === 'High' ? 'destructive' : 'outline'}
                                className="text-xs"
                              >
                                {skill.importance} Priority
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckSquare className="h-4 w-4" />
                    <h4 className="font-semibold">Common Tasks ({result.matches.tasks.length})</h4>
                  </div>
                  <div className="space-y-3">
                    {result.matches.tasks.map((task) => (
                      <Card key={task.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <h5 className="font-medium">{task.task_name}</h5>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {task.frequency}
                              </Badge>
                              <Badge
                                variant={task.complexity === 'High' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {task.complexity} Complexity
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="knowledge" className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-4 w-4" />
                    <h4 className="font-semibold">Knowledge Areas ({result.matches.knowledgeAreas.length})</h4>
                  </div>
                  <div className="space-y-3">
                    {result.matches.knowledgeAreas.map((area) => (
                      <Card key={area.id} className="p-4">
                        <div className="space-y-2">
                          <h5 className="font-medium">{area.knowledge_area}</h5>
                          <p className="text-sm text-muted-foreground">
                            {area.ability_description}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="reasoning" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">AI Analysis Reasoning</CardTitle>
                      <CardDescription>
                        How the AI analyzed and classified this company
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="prose prose-sm max-w-none">
                          <p className="text-muted-foreground leading-relaxed">
                            {result.analysis.reasoning}
                          </p>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                              Analysis Confidence
                            </Label>
                            <p className="font-medium">{result.confidence}%</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                              AI Detected Skills
                            </Label>
                            <p className="font-medium">{result.analysis.skills.length} skills</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                              Matched Records
                            </Label>
                            <p className="font-medium">{result.matches.skills.length} total</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Analysis Button */}
      {result && selectedIndustry && !isAnalyzerLocked && (
        <div className="flex justify-end mt-4">
          <Button
            onClick={saveAnalysis}
            className="bg-green-600 hover:bg-green-700"
          >
            Save Analysis & Lock Analyzer
          </Button>
        </div>
      )}

      {/* Locked Message */}
      {isAnalyzerLocked && (
        <Card className="border-yellow-200 bg-yellow-50 mt-4">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800 font-medium">
                Website analyzer is locked. You can only analyze one company per login session.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}