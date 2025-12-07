'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children}: ProtectedRouteProps){
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated){
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    //Show loading state while checking authentication
    if( isLoading ){
        return(
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    //No need to render if not authenticated
    if ( !isAuthenticated){
        return null;
    }

    return <>{children}</>
}