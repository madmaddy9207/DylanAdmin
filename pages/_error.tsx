import React from 'react';
import { NextPageContext } from 'next';

function Error({ statusCode }: { statusCode: number | undefined }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-slate-600 bg-slate-50">
            <h1 className="text-4xl font-bold mb-4">Error {statusCode}</h1>
            <p className="text-lg">
                {statusCode
                    ? `An error ${statusCode} occurred on server`
                    : 'An error occurred on client'}
            </p>
        </div>
    );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
    return { statusCode };
};

export default Error;
