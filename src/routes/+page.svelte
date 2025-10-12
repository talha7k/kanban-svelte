<script>
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
  <div class="container mx-auto px-4 py-16">
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to Kanban
      </h1>
       <p class="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
         Organize your projects and tasks with our flexible kanban board system.
         Create and manage teams, build projects with custom columns, define task types with structured input fields, and adapt workflows to your team's needs.
       </p>
    </div>

    <div class="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
      <Card class="text-center">
        <CardHeader>
          <CardTitle>Team Collaboration</CardTitle>
          <CardDescription>Work together seamlessly</CardDescription>
        </CardHeader>
         <CardContent>
           <p class="text-gray-600 dark:text-gray-300">
             Create and manage teams, build projects, and add team members with specific roles.
             Assign tasks, track progress, and collaborate seamlessly in real-time.
           </p>
         </CardContent>
      </Card>

       <Card class="text-center">
         <CardHeader>
           <CardTitle>Flexible Boards</CardTitle>
           <CardDescription>Customize your workflow</CardDescription>
         </CardHeader>
         <CardContent>
           <p class="text-gray-600 dark:text-gray-300">
             Create unlimited columns and drag-and-drop tasks to manage your project workflow visually.
             Adapt your board to any methodology or process.
           </p>
         </CardContent>
       </Card>

       <Card class="text-center">
         <CardHeader>
           <CardTitle>Custom Task Types</CardTitle>
           <CardDescription>Define your own workflows</CardDescription>
         </CardHeader>
         <CardContent>
           <p class="text-gray-600 dark:text-gray-300">
             Create custom card types with any input fields you need. Define patterns for task completion
             and ensure consistent, structured work across your team.
           </p>
         </CardContent>
       </Card>
    </div>

    <div class="text-center mt-12">
      <div class="space-x-4">
        <Button size="lg" onclick={() => goto('/login')}>
          Get Started
        </Button>
       
      </div>
    </div>
  </div>
</div>
