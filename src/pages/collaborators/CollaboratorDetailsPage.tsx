import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserData, UserData } from "@/services/firebase/auth";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, Calendar as CalendarIconLucide, List, Search, Filter, RotateCcw, FileSpreadsheet, Clock, CheckCircle2, XCircle, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { update, ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Checkbox } from "@/components/ui/checkbox";
import { Activity, ActivityStatus, getActivities } from "@/services/firebase/activities";
import { Client, PessoaJuridicaClient, PessoaFisicaClient, getClients } from "@/services/firebase/clients";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { exportActivitiesToExcel } from "@/utils/exportUtils";

const CollaboratorDetailsPage = () => {
  // ... (rest of the code remains unchanged)
};

export default CollaboratorDetailsPage;
