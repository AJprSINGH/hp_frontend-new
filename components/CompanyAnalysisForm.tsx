'use client';
import { useState } from 'react';
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

export function CompanyAnalysisForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<FormData>({
    resolver: zodResolver(urlSchema),
  });

  const websiteUrl = watch('websiteUrl');

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
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
              disabled={isLoading || !websiteUrl}
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
    </div>
  );
}