package com.easytennis.repository;

import com.easytennis.entity.PlayerProfile;
import com.easytennis.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlayerProfileRepository extends JpaRepository<PlayerProfile, Long> {

    List<PlayerProfile> findAllByUserOrderByNameAsc(User user);

    Optional<PlayerProfile> findByIdAndUser(Long id, User user);
}
