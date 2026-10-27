import Sidebar from "@/components/Sidebar";
export default function AppShell({children,name,role}:{children:React.ReactNode;name:string;role:string}){return <div className="layout"><Sidebar name={name} role={role}/><main className="main">{children}</main></div>}
