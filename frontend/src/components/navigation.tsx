'use client'

import { Link } from "@/navigation";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "./theme-switcher";

export function Navigation(){
    const t = useTranslations('common');
    
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
                    {t('navigation.features')}
                    </Link>
                    <Link href="#about" className="">
                    {t('navigation.about')}
                    </Link>
                    <ThemeSwitcher/>
                    <Link 
                        href="/login" className="">
                    {t('navigation.signIn')}
                    </Link>
                </nav>   
            </div>
        </header>
    )
}