package com.easytennis.repository;

import com.easytennis.entity.GameDay;
import com.easytennis.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GameDayRepository extends JpaRepository<GameDay, Long> {

    List<GameDay> findAllByUserOrderByDateDesc(User user);

    Optional<GameDay> findByIdAndUser(Long id, User user);
}
