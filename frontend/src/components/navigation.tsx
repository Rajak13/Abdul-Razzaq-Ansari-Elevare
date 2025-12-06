'use client'

import Link from "next/link";
import { ThemeSwitcher } from "./theme-switcher";

export function Navigation(){
    return (
        <header>
            <div className="">
                <Link href="/" className="">
                <div className="">
                    <span className="">Elevare</span>
                </div>
                </Link>
                <nav className="">
                    <Link href="#features" className="">
                    Features
                    </Link>
                    <Link href="#about" className="">
                    Features
                    </Link>
                    <ThemeSwitcher/>
                    <Link 
                        href="/login" className="">
                    Sign In
                    </Link>
                </nav>   
            </div>
        </header>
    )
}