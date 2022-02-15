import { Link } from 'react-router-dom';

export default function ConditionalLink({ children, to, condition }: any) {
	return !!condition && to ? <Link to={to}>{children}</Link> : <>{children}</>;
}
