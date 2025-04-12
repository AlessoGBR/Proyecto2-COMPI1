import { Routes } from '@angular/router';
import { HomeComponent } from './Components/Home/home/home.component';
import { EditorComponent } from './Components/Editor/editor/editor.component';
import { ConsoleComponent } from './Components/Console/console/console.component';

export const routes: Routes = [
    {path: '', redirectTo: '/home', pathMatch: 'full'},
    {path: 'home', component: HomeComponent},
    {path: 'editor', component: EditorComponent},
    {path: 'console', component: ConsoleComponent},
];
