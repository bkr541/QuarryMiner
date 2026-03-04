import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Environment } from '../../hooks/useEnvironments';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    environment: Environment | null;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm, environment }) => {
    const [isDeleting, setIsDeleting] = React.useState(false);

    if (!isOpen || !environment) return null;

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
        } finally {
            setIsDeleting(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                className="bg-[#121212] border border-[#333333] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden shadow-black/50 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-4 text-rose-500 mb-4">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-[#E4E3E0]">Delete Environment?</h2>
                </div>

                <p className="text-sm font-mono text-[#A1A1AA] leading-relaxed mb-6">
                    Are you sure you want to delete <span className="font-bold text-[#E4E3E0]">"{environment.name}"</span>?
                    Configurations referencing this environment will have their environment set to <span className="text-rose-400">NULL</span>. This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wide text-[#A1A1AA] hover:text-[#E4E3E0] hover:bg-[#222222] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wide bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Environment'}
                    </button>
                </div>
            </div>
        </div>
    );
};
