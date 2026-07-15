import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Check, Trash2, Edit } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/services/authApi';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

const RbacSettings = () => {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // 1. Fetch grouped permissions and roles
  const { data: permissionsData, isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => authApi.getPermissions(),
  });

  const { data: rolesData, isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => authApi.getRoles(),
    onSuccess: (data) => {
      if (data?.data?.length > 0 && !selectedRoleId) {
        setSelectedRoleId(data.data[0]._id);
      }
    },
  });

  // 2. Mutations
  const createRoleMutation = useMutation({
    mutationFn: (data) => authApi.createRole(data),
    onSuccess: (res) => {
      toast.success('تم إنشاء الدور الجديد بنجاح');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsCreating(false);
      setNewRoleName('');
      setNewRoleKey('');
      setNewRoleDesc('');
      setSelectedRoleId(res.data._id);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'فشل إنشاء الدور');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => authApi.updateRole(id, data),
    onSuccess: () => {
      toast.success('تم حفظ الصلاحيات المحدثة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'فشل حفظ الصلاحيات');
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => authApi.deleteRole(id),
    onSuccess: () => {
      toast.success('تم حذف الدور بنجاح');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRoleId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'لا يمكن حذف الدور المطلوب');
    },
  });

  const roles = rolesData?.data || [];
  const permissionsGrouped = permissionsData?.data || {};

  // Find currently selected role object
  const activeRole = roles.find((r) => r._id === selectedRoleId) || roles[0];

  // Set first role as active on load if none selected
  React.useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0]._id);
    }
  }, [roles, selectedRoleId]);

  const handlePermissionToggle = (permKey) => {
    if (!activeRole) return;

    let updatedPermissions = [...activeRole.permissions];
    if (updatedPermissions.includes(permKey)) {
      updatedPermissions = updatedPermissions.filter((k) => k !== permKey);
    } else {
      updatedPermissions.push(permKey);
    }

    updateRoleMutation.mutate({
      id: activeRole._id,
      data: { permissions: updatedPermissions },
    });
  };

  const handleCreateRole = (e) => {
    e.preventDefault();
    if (!newRoleName || !newRoleKey) {
      toast.error('الرجاء إدخال الاسم ومفتاح الكود الفريد');
      return;
    }
    createRoleMutation.mutate({
      name: newRoleName,
      key: newRoleKey.toUpperCase().replace(/\s+/g, '_'),
      description: newRoleDesc,
      permissions: [],
    });
  };

  if (loadingRoles || loadingPerms) {
    return <div className="text-center py-8 font-black">جاري تحميل الصلاحيات والأدوار...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right" dir="rtl">

      {/* Roles Navigation List */}
      <Card className="lg:col-span-1 shadow-lg border border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Shield className="h-5 w-5 text-secondary" />
            الأدوار المتاحة
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1 font-bold text-xs"
            onClick={() => setIsCreating(!isCreating)}
          >
            <Plus className="h-4 w-4" />
            جديد
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {isCreating ? (
            <form onSubmit={handleCreateRole} className="space-y-4 border p-3 rounded-xl bg-slate-50">
              <h4 className="text-sm font-black text-slate-800">إضافة دور مخصص جديد</h4>
              <div className="space-y-2">
                <Label className="text-xs">اسم الدور (بالعربية)</Label>
                <Input
                  placeholder="مثال: موظف استقبال"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="bg-white text-xs h-9 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">مفتاح الدور (SYSTEM_KEY)</Label>
                <Input
                  placeholder="مثال: RECEPTIONIST"
                  value={newRoleKey}
                  onChange={(e) => setNewRoleKey(e.target.value)}
                  className="bg-white text-xs h-9 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">وصف مبسط</Label>
                <Input
                  placeholder="ما هي مسؤوليات هذا الدور؟"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="bg-white text-xs h-9 rounded-xl"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  className="text-xs rounded-xl"
                  onClick={() => setIsCreating(false)}
                >
                  إلغاء
                </Button>
                <Button size="sm" type="submit" className="text-xs rounded-xl" disabled={createRoleMutation.isPending}>
                  حفظ
                </Button>
              </div>
            </form>
          ) : (
            roles.map((role) => (
              <div
                key={role._id}
                onClick={() => setSelectedRoleId(role._id)}
                className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                  (activeRole?._id === role._id)
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-100'
                }`}
              >
                <div>
                  <h4 className="text-sm font-black">{role.name}</h4>
                  <p className={`text-[10px] mt-0.5 max-w-[150px] truncate ${
                    activeRole?._id === role._id ? 'text-primary-foreground/70' : 'text-slate-400'
                  }`}>
                    {role.description || 'لا يوجد وصف'}
                  </p>
                </div>

                {/* Delete button for non-system roles */}
                {!['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'].includes(role.key) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('هل أنت متأكد من رغبتك في حذف هذا الدور؟')) {
                        deleteRoleMutation.mutate(role._id);
                      }
                    }}
                    className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 ${
                      activeRole?._id === role._id ? 'text-red-200' : 'text-red-500'
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Permissions Checkbox Grid Panel */}
      <Card className="lg:col-span-2 shadow-lg border border-slate-200">
        {activeRole ? (
          <>
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-black text-primary">
                صلاحيات {activeRole.name} ({activeRole.key})
              </CardTitle>
              <CardDescription className="text-xs">
                قم بتفعيل الصلاحيات الممنوحة لهذا الدور. التعديل يتم حفظه تلقائياً.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {Object.keys(permissionsGrouped).map((groupName) => (
                <div key={groupName} className="space-y-3">
                  <h3 className="text-sm font-black text-secondary border-b pb-1">
                    {groupName}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissionsGrouped[groupName].map((perm) => {
                      const isChecked = activeRole.permissions?.includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          onClick={() => handlePermissionToggle(perm.key)}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-secondary/5 border-secondary/30 text-slate-800'
                              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                            isChecked ? 'bg-secondary border-secondary text-white' : 'border-slate-200'
                          }`}>
                            {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <p className="text-xs font-black">{perm.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{perm.description || 'مفتاح الصلاحية: ' + perm.key}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </>
        ) : (
          <div className="text-center py-20 text-slate-400 font-bold">يرجى اختيار دور من القائمة لعرض صلاحياته.</div>
        )}
      </Card>
    </div>
  );
};

export default RbacSettings;
